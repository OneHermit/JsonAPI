export default async function onRequest(context) {
  try {
    // ===================== 步骤1：解析并校验分页参数 =====================
    const request = context.request || new Request('http://localhost'); // 本地调试兜底
    const url = new URL(request.url);
    // 从查询参数中获取 page 和 size，默认值分别为 1 和 10
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const size = parseInt(url.searchParams.get('size') || '10', 10);

    // 参数合法性校验：避免负数、非数字、过大的 size（限制最大为 50，可根据需求调整）
    const validPage = Math.max(1, isNaN(page) ? 1 : page); // 页码至少为 1
    const validSize = Math.max(1, Math.min(50, isNaN(size) ? 10 : size)); // 条数 1~50 之间

    // ===================== 步骤2：读取静态 JSON 文件（跨平台兼容方式） =====================
    // 方式1：使用相对 URL 直接 fetch（推荐，适配大部分平台：Cloudflare/Vercel/Netlify 等）
    // 注意：JSON 文件需放在项目的静态资源目录（如 public/course/getHaokanVideos.json）
    let assetResponse;
    try {
      // 构造 JSON 文件的完整 URL（相对路径转绝对路径）
      const jsonFileUrl = new URL('/course/getHaokanVideos.json', request.url);
      // 直接 fetch 静态文件（无需依赖平台专属 API）
      assetResponse = await fetch(jsonFileUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // 缓存策略（可选，根据需求调整：no-cache 每次获取最新，cache-first 缓存优先）
        cache: 'no-cache'
      });
    } catch (err) {
      // 方式2：本地调试兜底（若相对路径 fetch 失败，可替换为本地绝对路径/公网 URL）
      // 注意：生产环境请注释掉这部分，仅用于本地测试
      const localJsonUrl = 'https://jsonapi-vdwkdcov.edgeone.cool/course/getHaokanVideos.json'; // 本地静态服务地址
      assetResponse = await fetch(localJsonUrl);
    }

    // 处理文件读取失败的情况（如文件不存在、404 等）
    if (!assetResponse.ok) {
      throw new Error(`读取 JSON 文件失败：${assetResponse.status} ${assetResponse.statusText}`);
    }

    // 解析 JSON 数据（需确保文件内容是合法的 JSON 格式，推荐为数组）
    const rawData = await assetResponse.json()['videos'];

    // ===================== 步骤3：分页处理数据 =====================
    // 校验数据类型：确保原始数据是数组（若 JSON 文件是对象，如 { "list": [...] }，则改为 rawData.list）
    if (!Array.isArray(rawData)) {
      throw new Error('JSON 文件数据格式错误，需为数组类型');
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
        // 解决跨域问题（生产环境可改为指定域名，如 https://yourdomain.com）
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    // ===================== 错误处理：返回友好的错误响应 =====================
    return new Response(JSON.stringify({
      code: 500,
      message: '数据获取失败',
      error: error.message // 错误信息（生产环境可隐藏，仅返回通用提示：'服务器内部错误'）
    }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      status: 500 // HTTP 状态码 500
    });
  }
}