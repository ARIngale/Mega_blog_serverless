
# Mega Blog

Mega Blog is a modern, **serverless** blogging platform built with **Express.js**, **MongoDB**, and **React**. It follows a **completely serverless architecture**, utilizing **AWS Lambda, API Gateway, and S3**, ensuring high scalability, reduced operational costs, and seamless performance.

## Features

- 📝 **User Authentication** – Secure login and registration system.
- 📖 **Create & Manage Blogs** – Users can write, edit, and delete blog posts.
- 📦 **Cloud Storage** – Blog images and assets are stored in **AWS S3**.
- ⚡ **Fully Serverless Architecture** – No need for traditional servers; everything is managed using AWS cloud services.
- 🚀 **Auto-Scaling** – AWS Lambda handles traffic surges without manual intervention.
- 💰 **Cost-Effective** – Pay only for the actual compute time used, minimizing expenses.

## Tech Stack

### Frontend:
- **React.js** – UI development
- **Tailwind CSS** – Styling

### Backend:
- **Express.js** – API development (deployed as AWS Lambda functions)
- **MongoDB Atlas** – Cloud database
- **Mongoose** – ODM for MongoDB

### Cloud & Deployment:
- **AWS Lambda** – Fully serverless backend execution
- **AWS API Gateway** – Manages API requests efficiently
- **AWS S3** – Storage for media files and static assets
- **Vercel** – Frontend hosting for seamless deployment

## Why Serverless?
- **Scalability** – Automatically scales based on demand.
- **High Availability** – AWS ensures uptime and reliability.
- **No Server Management** – Focus on development, not infrastructure.
- **Performance Optimization** – Low-latency API responses.

---

## 🚀 Backend Setup & Deployment Guide

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/mega-blog.git
cd mega-blog/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file and add the following:

```env
DB_LOCATION=your_mongodb_atlas_connection_string
SECREAT_ACCESS_KEY=your_jwt_secret
AWS_ACCESS_KEY=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
FIREBASE_SERVICE_ACCOUNT=your_firebase_config
```

---

## 🌐 Online Mode (Serverless Deployment on AWS Lambda)

### 4. Prepare Express for Serverless

Install `serverless-http`:

```bash
npm install serverless-http
```

In your `index.js` or `app.js`, wrap Express with:

```js
const serverless = require('serverless-http');
module.exports.handler = serverless(app);
```

### 5. Create `serverless.yml`

```yaml
service: mega-blog-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: ap-south-1
  environment:
    MONGO_URI: ${env:MONGO_URI}
    JWT_SECRET: ${env:JWT_SECRET}
    AWS_REGION: ${env:AWS_REGION}
    S3_BUCKET_NAME: ${env:S3_BUCKET_NAME}

functions:
  app:
    handler: index.handler
    events:
      - http:
          path: /
          method: any
      - http:
          path: /{proxy+}
          method: any

plugins:
  - serverless-offline
```

### 6. Deploy

```bash
npm install -g serverless
sls deploy
```

Your deployed API endpoint will look like:
```
https://<api-id>.execute-api.<region>.amazonaws.com/dev
```

---

## 💻 Offline Mode (Local Development)

### 1. Add Serverless Offline Plugin

Install:

```bash
npm install --save-dev serverless-offline
```

Add to `serverless.yml`:

```yaml
plugins:
  - serverless-offline
```

### 2. Run Locally

```bash
sls offline start
```

Server will be running at:
```
http://localhost:3000/dev
```

---

💡 **Mega Blog** is a powerful, fully serverless blogging platform designed for scale and performance.
