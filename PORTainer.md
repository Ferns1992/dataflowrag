# DataFlowRAG

## Portainer Deployment

### Option 1: Deploy from GitHub

1. Login to Portainer
2. Go to **Stacks** → **Add stack**
3. Select **Git repository**
4. Repository URL: `https://github.com/Ferns1992/dataflowrag.git`
5. Compose template: Leave empty
6. Click **Deploy stack**

### Option 2: Deploy with pre-built frontend

The frontend needs to be built first. On your local machine:

```bash
git clone https://github.com/Ferns1992/dataflowrag.git
cd dataflowrag
./build.sh
git add .
git commit -m "Add built frontend"
git push
```

Then deploy in Portainer as Option 1.

### Environment Variables

Set in Portainer stack editor or .env file:
- `OPENAI_API_KEY` - Your OpenAI API key (optional for RAG)

### Access

After deployment: **http://your-vps-ip:4030**

### Default Login
- Username: `admin`
- Password: `admin`
