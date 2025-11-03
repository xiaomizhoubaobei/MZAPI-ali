import axios from 'axios';

// 使用完整的本地URL，指向我们自己的代理端点
const SUBMIT = `${process.env.API_BASE_URL || 'http://localhost:' + (process.env.PORT || '3000')}/api/modelscope/submit`;
const QUERY = `${process.env.API_BASE_URL || 'http://localhost:' + (process.env.PORT || '3000')}/api/modelscope/query`;

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
  async cartoonizeImage(imageUrl: string): Promise<string> {    
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
      const submitResponse = await axios.post<SubmitResponse>(SUBMIT, payload, { headers });
      
      // 检查响应状态
      if (!submitResponse.data.Success) {
        const error = new Error(`任务提交失败: ${submitResponse.data.Message}`);
        error.name = 'SubmitTaskError';
        throw error;
      }
      
      const taskId = submitResponse.data.Data.id;

      // 2. 轮询结果
      let retryCount = 0;
      const maxRetries = 30; // 最多轮询30次（约60秒）
      
      while (retryCount < maxRetries) {
        const queryResponse = await axios.post<QueryResponse>(QUERY, { id: taskId }, { headers });
        
        // 检查查询响应状态
        if (!queryResponse.data.Success) {
          const error = new Error(`任务查询失败: ${queryResponse.data.Message}`);
          error.name = 'QueryTaskError';
          throw error;
        }
        
        const data = queryResponse.data.Data;

        // Status 2 means succeeded according to the API response
        if (data.status === 2) {
          return data.data.output_img;
        }

        // Status 3 means failed according to the API response
        if (data.status === 3) {
          const error = new Error('图像处理任务失败');
          error.name = 'ProcessTaskError';
          throw error;
        }

        retryCount++;
        // 等待2秒后再次查询
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 超过最大重试次数
      const error = new Error('图像处理超时，请稍后再试');
      error.name = 'TaskTimeoutError';
      throw error;
    } catch (error) {
      // 直接重新抛出捕获的错误，避免不必要的包装
      throw error;
    }
  }
}