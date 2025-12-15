// 文件路径 ./edge-functions/api/hello.js
// 访问路径 example.com/api/hello
// export default function onRequest(context) {
//   return new Response('Hello from Edge Functions!');
// }

// 注意：因为涉及异步操作（fetch 读取文件），函数需声明为 async
export default async function onRequest(context) {
  try {
    // ===================== 步骤1：解析并校验分页参数 =====================
    const request = context.request;
    const url = new URL(request.url);
    // 从查询参数中获取 page 和 size，默认值分别为 1 和 10
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const size = parseInt(url.searchParams.get('size') || '10', 10);

    // 参数合法性校验：避免负数、非数字、过大的 size（限制最大为 50，可根据需求调整）
    const validPage = Math.max(1, isNaN(page) ? 1 : page); // 页码至少为 1
    const validSize = Math.max(1, Math.min(50, isNaN(size) ? 10 : size)); // 条数 1~50 之间

    // ===================== 步骤2：读取远程 JSON 文件 =====================
    const remoteUrl = 'https://jsonapi-vdwkdcov.edgeone.cool/course/getHaokanVideos.json';
    const remoteResponse = await fetch(remoteUrl);

    // 处理文件读取失败的情况（如文件不存在、404 等）
    if (!remoteResponse.ok) {
      throw new Error(`读取远程 JSON 文件失败：${remoteResponse.status} ${remoteResponse.statusText}`);
    }

    // 解析 JSON 数据（需确保文件内容是合法的 JSON 格式，推荐为数组）
    const responseData = await remoteResponse.json();
    const rawData = responseData.videos; // 根据您的 JSON 结构提取 videos 字段

    // ===================== 步骤3：分页处理数据 =====================
    // 校验数据类型：确保原始数据是数组（若 JSON 文件是对象，如 { "list": [...] }，则改为 rawData.list）
    if (!Array.isArray(rawData)) {
      throw new Error('JSON 文件数据格式错误，videos 字段需为数组类型');
    }

    const total = rawData.length; // 总数据条数
    const startIndex = (validPage - 1) * validSize; // 分页起始索引
    const endIndex = startIndex + validSize; // 分页结束索引
    const paginatedData = rawData.slice(startIndex, endIndex); // 截取分页数据

    // ===================== 步骤4：返回标准化 JSON 响应 =====================
    return new Response(JSON.stringify({
      code: 200, // 业务状态码
      message: '数据获取成功',
      data: paginatedData, // 分页后的数据
      pagination: { // 分页信息（便于前端处理）
        page: validPage, // 当前页
        size: validSize, // 每页条数
        total, // 总条数
        totalPages: Math.ceil(total / validSize) // 总页数
      }
    }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8', // 声明响应类型为 JSON
        'Access-Control-Allow-Origin': '*' // 解决跨域问题（生产环境可改为指定域名，如 https://yourdomain.com）
      }
    });

  } catch (error) {
    // ===================== 错误处理：返回友好的错误响应 =====================
    return new Response(JSON.stringify({
      code: 500,
      message: '数据获取失败',
      error: error.message // 错误信息（生产环境可隐藏，仅返回通用提示）
    }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      status: 500 // HTTP 状态码 500
    });
  }
}