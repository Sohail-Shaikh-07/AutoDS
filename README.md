# 🤖 AutoDS: The Autonomous Data Science Agent

<div align="center">

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge&logo=statuspage)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-cyan?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.95%2B-009688?style=for-the-badge&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

_Your intelligent pair programmer for Data Science, Machine Learning, and Analytics._

</div>

---

## 📖 Overview

**AutoDS** is not just a chatbot; it's a fully **Agentic AI System** designed to automate the heavy lifting of data science. It acts as a senior data scientist that lives in your browser, capable of connecting to databases, cleaning data, training models, and visually explaining its reasoning.

Built with a **React (Vite)** frontend and a **FastAPI** backend, it leverages **Large Language Models (GLM-4)** to understand complex queries and execute Python code in a secure, self-correcting sandbox.

---

## ✨ Features

### 1. 🧠 Agentic "Vibe Coding" Core

The heart of AutoDS is its intelligent agent loop.

- **Chain of Thought**: See exactly what the AI is thinking before it acts. The agent breaks down complex problems into steps ("Planning", "Coding", "Verifying").
- **Self-Healing Executive**: If the generated code errors (e.g., a missing library or wrong column name), the agent captures the `stderror`, analyzes the bug, and **auto-corrects** the code in the next iteration.
- **Context Awareness**: It remembers your previous queries, uploaded files, and active dataframes.

### 2. 📊 Automated Exploratory Data Analysis (Auto-EDA)

Stop writing boilerplate Pandas code.

- **Instant Reports**: Upload a CSV/Excel file and get a professional, magazine-quality HTML report (via **Sweetviz**) analyzing distributions, correlations, and missing values.
- **Interactive Visualization**: The agent generates dynamic **Plotly** charts (Scatter, Bar, Heatmaps) that you can zoom, pan, and hover over directly in the chat interface.

### 3. 🔌 Universal Database Connectors

Connect your real-world data sources safely.

- **SQL Integration**: Native support for **PostgreSQL**, **MySQL**, and **SQLite**.
- **Schema Introspection**: The agent can "see" your database tables and columns automatically.
- **Secure Querying**: Ask questions like _"Analyze the monthly revenue from the `sales` table"_ and watch it write efficient SQL queries.

### 4. 🚀 MLOps & Training Workflow

AutoDS handles both quick prototypes and heavy production training.

- **Lightweight Models** (Path A): For quick tasks (e.g., Random Forest on <100k rows), it trains the model instantly and saves the `.pkl` file to your `backend/models/` directory for download.
- **Heavyweight Training** (Path B): For Deep Learning or huge datasets, the agent **generates a production-grade Jupyter Notebook (`train.ipynb`)**, which you can download and run on a GPU cluster (Colab/Kaggle).

### 5. 🔍 Explainable AI (XAI)

Don't trust black boxes.

- **SHAP Integration**: Ask _"Why did the model predict this?"_
- **Feature Importance**: The agent calculates Shapley values and renders **Beeswarm Plots** to show exactly which features drove the prediction, ensuring transparency and trust.

---

## 🛠️ Installation & Setup

### Prerequisites

- Python 3.10 or higher
- Node.js 16 or higher

### 1. Backend Setup

```bash
git clone https://github.com/Sohail-Shaikh-07/AutoDS.git
cd AutoDS/backend

# Create virtual environment (optional but recommended)
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt
```

**Configuration**: Create a `.env` file in `backend/` and add your LLM API Key:

```env
DEEPINFRA_API_KEY=your_api_key_here
```

### 2. Frontend Setup

```bash
cd ../frontend
npm install
```

### 3. Running the App

We've provided a unified runner script for convenience. From the root `AutoDS/` folder:

```bash
# This launches both FastAPI (Port 8000) and React (Port 5173)
python run.py
```

---

## � Project Structure

```
AutoDS/
├── backend/
│   ├── agent.py            # Core AI Logic (ReAct Loop)
│   ├── databaseManager.py  # SQLAlchemy Connection Handler
│   ├── main.py             # FastAPI Routes & Websockets
│   ├── models/             # Directory for Saved ML Models (.pkl)
│   └── prompt.md           # System Prompt (The "Brain")
├── frontend/
│   ├── src/components/
│   │   ├── ChatInterface.tsx   # Main Chat UI with Markdown Support
│   │   ├── DatabaseModal.tsx   # DB Connection UI
│   │   └── InteractivePlot.tsx # Plotly Renderer
│   └── App.tsx                 # Main Layout & State Management
├── run.py                  # Process Orchestrator
└── README.md               # You are here
```

---

<div align="center">
Made with ❤️ by Sohail Shaikh
</div>
