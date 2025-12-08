// api/paginate.js（Vercel Serverless 脚本）
export default async function handler(req, res) {
    // 1. 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // 2. 获取分页参数（默认 page=1，size=10）
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;

    try {
        // 3. 读取 GitHub 上的总数据 JSON
        const totalDataRes = await fetch('https://raw.githubusercontent.com/OneHermit/JsonAPI/refs/heads/main/course/getHaoKanVideo.json');
        if (!totalDataRes.ok) throw new Error('获取总数据失败');
        const totalData = await totalDataRes.json();

        // 4. 计算分页逻辑
        const start = (page - 1) * size; // 起始索引
        const end = start + size;        // 结束索引
        const paginatedList = totalData.list.slice(start, end); // 截取分页数据
        const totalPages = Math.ceil(totalData.total / size);   // 总页数

        // 5. 返回分页结果
        res.status(200).json({
            code: 200,
            msg: '分页成功',
            data: {
                page,
                size,
                total: totalData.total,
                totalPages,
                list: paginatedList
            }
        });
    } catch (err) {
        // 异常处理
        res.status(500).json({
            code: 500,
            msg: `请求失败：${err.message}`
        });
    }
}