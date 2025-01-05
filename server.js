const express = require('express');
const AWS = require('aws-sdk');
const app = express();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET_NAME = 'your-bucket-name';

// 保存对话到S3
app.post('/api/conversations', async (req, res) => {
    try {
        const fileName = `conversations/${Date.now()}-${req.body.walletAddress}.json`;
        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: JSON.stringify(req.body),
            ContentType: 'application/json'
        }).promise();
        
        res.json({ success: true, fileName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 从S3获取对话
app.get('/api/conversations', async (req, res) => {
    try {
        const objects = await s3.listObjects({
            Bucket: BUCKET_NAME,
            Prefix: 'conversations/'
        }).promise();
        
        const conversations = await Promise.all(
            objects.Contents.map(async (obj) => {
                const data = await s3.getObject({
                    Bucket: BUCKET_NAME,
                    Key: obj.Key
                }).promise();
                return JSON.parse(data.Body.toString());
            })
        );
        
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}); 