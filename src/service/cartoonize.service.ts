import axios from 'axios';
import { Logger } from '../logger';

// 直接连接到ModelScope API
const MODEL = 'iic/cv_unet_person-image-cartoon-3d_compound-models';
const SUBMIT_URL = `https://modelscope.cn/api/v1/models/${MODEL}/widgets/submit`;
const QUERY_URL = `https://modelscope.cn/api/v1/models/${MODEL}/widgets/query`;

const headers = {
  'Content-Type': 'application/json',
  'bx-v': '2.5.31',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

interface Payload {
  task: string;
  inputs: string[];
  parameters: Record<string, any>;
  urlPaths: {
    inUrls: { type: string; fileType: string }[];
    outUrls: { outputKey: string; type: string }[];
  };
}

interface SubmitResponse {
  Code: number;
  Data: {
    id: string;
  };
  Message: string;
  RequestId: string;
  Success: boolean;
}

interface QueryResponse {
  Code: number;
  Data: {
    code: number;
    status: number;
    data: {
      output_img: string;
    };
  };
  Message: string;
  RequestId: string;
  Success: boolean;
}

export class CartoonizeService {
  async cartoonizeImage(imageUrl: string, userId: string = 'anonymous', requestId?: string): Promise<string> {    
    Logger.info('CartoonizeService', 'cartoonizeImage', '开始处理图像卡通化请求', {
      imageUrl: imageUrl?.substring(0, 50) + '...', // 只记录URL的前50个字符以保护隐私
      userId,
      requestId
    });

    // 1. 提交任务
    const payload: Payload = {
      task: "image-portrait-stylization",
      inputs: [imageUrl],
      parameters: {},
      urlPaths: {
        inUrls: [{ type: "image", fileType: "png" }],
        outUrls: [{ outputKey: "output_img", type: "image" }]
      }
    };

    try {
      Logger.debug('CartoonizeService', 'cartoonizeImage', '提交卡通化任务到ModelScope API', {
        payloadSize: JSON.stringify(payload).length,
        userId,
        requestId
      });

      const submitResponse = await axios.post<SubmitResponse>(SUBMIT_URL, payload, { headers });
      
      // 检查响应状态
      if (!submitResponse.data.Success) {
        const error = new Error(`任务提交失败: ${submitResponse.data.Message}`);
        error.name = 'SubmitTaskError';
        Logger.error('CartoonizeService', 'cartoonizeImage', '任务提交失败', {
          error: error.message,
          response: submitResponse.data,
          userId,
          requestId
        });
        
        // 记录审计日志 - 任务提交失败
        Logger.audit('CREATE', 'MODELSCOPE_TASK', 'FAILED', `任务提交失败：${error.message}`, {
          userId,
          requestId
        });
        
        throw error;
      }
      
      const taskId = submitResponse.data.Data.id;
      Logger.info('CartoonizeService', 'cartoonizeImage', '任务提交成功', {
        taskId,
        userId,
        requestId
      });

      // 记录审计日志 - 任务提交成功
      Logger.audit('CREATE', 'MODELSCOPE_TASK', 'SUBMITTED', '任务提交成功', {
        taskId,
        userId,
        requestId
      });

      // 2. 轮询结果
      let retryCount = 0;
      const maxRetries = 30; // 最多轮询30次（约60秒）
      
      while (retryCount < maxRetries) {
        Logger.debug('CartoonizeService', 'cartoonizeImage', '轮询任务状态', {
          taskId,
          retryCount: retryCount + 1,
          maxRetries,
          userId,
          requestId
        });

        const queryResponse = await axios.post<QueryResponse>(QUERY_URL, { id: taskId }, { headers });
        
        // 检查查询响应状态
        if (!queryResponse.data.Success) {
          const error = new Error(`任务查询失败: ${queryResponse.data.Message}`);
          error.name = 'QueryTaskError';
          Logger.error('CartoonizeService', 'cartoonizeImage', '任务查询失败', {
            error: error.message,
            taskId,
            response: queryResponse.data,
            userId,
            requestId
          });
          
          // 记录审计日志 - 任务查询失败
          Logger.audit('READ', 'MODELSCOPE_TASK', 'FAILED', `任务查询失败：${error.message}`, {
            taskId,
            userId,
            requestId
          });
          
          throw error;
        }
        
        const data = queryResponse.data.Data;

        // Status 2 means succeeded according to the API response
        if (data.status === 2) {
          Logger.info('CartoonizeService', 'cartoonizeImage', '图像处理成功完成', {
            taskId,
            userId,
            requestId
          });
          
          // 记录审计日志 - 任务处理成功
          Logger.audit('UPDATE', 'MODELSCOPE_TASK', 'SUCCESS', '图像处理成功完成', {
            taskId,
            userId,
            requestId
          });
          
          return data.data.output_img;
        }

        // Status 3 means failed according to the API response
        if (data.status === 3) {
          const error = new Error('图像处理任务失败');
          error.name = 'ProcessTaskError';
          Logger.error('CartoonizeService', 'cartoonizeImage', '图像处理任务失败', {
            error: error.message,
            taskId,
            userId,
            requestId
          });
          
          // 记录审计日志 - 任务处理失败
          Logger.audit('UPDATE', 'MODELSCOPE_TASK', 'FAILED', `图像处理任务失败：${error.message}`, {
            taskId,
            userId,
            requestId
          });
          
          throw error;
        }

        retryCount++;
        // 等待2秒后再次查询
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 超过最大重试次数
      const error = new Error('图像处理超时，请稍后再试');
      error.name = 'TaskTimeoutError';
      Logger.error('CartoonizeService', 'cartoonizeImage', '图像处理超时', {
        taskId,
        maxRetries,
        userId,
        requestId
      });
      
      // 记录审计日志 - 任务处理超时
      Logger.audit('UPDATE', 'MODELSCOPE_TASK', 'TIMEOUT', '图像处理超时', {
        taskId,
        maxRetries,
        userId,
        requestId
      });
      
      throw error;
    } catch (error: any) {
      Logger.error('CartoonizeService', 'cartoonizeImage', '图像卡通化处理过程中发生错误', {
        error: error.message,
        stack: error.stack,
        imageUrl: imageUrl?.substring(0, 50) + '...',
        userId,
        requestId
      });
      
      // 记录审计日志 - 处理过程中发生错误
      Logger.audit('CREATE', 'MODELSCOPE_TASK', 'ERROR', `图像卡通化处理过程中发生错误：${error.message}`, {
        userId,
        requestId
      });
      
      // 直接重新抛出捕获的错误，避免不必要的包装
      throw error;
    }
  }
}