export default async function handler(req, res) {
  try {
    // Đọc toàn bộ body thô, bất kể là JSON hay multipart (ảnh)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    console.log('=== HIKVISION TEST HIT ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body length (bytes):', rawBody.length);
    console.log('Body preview:', rawBody.toString('utf8').slice(0, 1500));
    console.log('=== END ===');

    res.status(200).json({ ok: true, receivedBytes: rawBody.length });
  } catch (err) {
    console.error('Lỗi test endpoint:', err);
    res.status(200).json({ ok: false, error: err.message });
  }
}
