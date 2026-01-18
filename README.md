# AutoDS - AI Data Science Agent

AutoDS is an intelligent agent that automates data science workflows, from data ingestion to model training and visualization.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS (Modern 3-panel layout)
- **Backend**: FastAPI (Python) + WebSockets
- **AI**: DeepInfra (GLM-4.7) for reasoning and code generation

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Features

- **Real-time Thinking**: Visibility into the agent's thought process.
- **Interactive Chat**: Natural language commands for data analysis.
- **Status Terminal**: Live logs of agent activities.
- **File Explorer**: Management of uploaded datasets and generated reports.
