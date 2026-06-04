# 🌾 Agronomy RAG System

An AI-powered Agriculture Q&A system built using 
RAG (Retrieval Augmented Generation) architecture.

## 🚀 Live Demo
[Try it here](https://llm-chat-hndyi2dj2-holland1024s-projects.vercel.app/)

## 🛠️ Tech Stack
- *Embeddings:* Sentence Transformers (all-MiniLM-L6-v2)
- *Vector Store:* FAISS
- *PDF Processing:* PyPDF
- *Frontend:* Gradio
- *Hosting:* HuggingFace Spaces

## ⚙️ How It Works
1. PDF loaded and split into chunks
2. Chunks converted to embeddings using Sentence Transformers
3. Stored in FAISS vector index
4. User query → similarity search → relevant context returned

## 📦 Installation
pip install -r requirements.txt

## 🧑‍💻 Author
Pragadeeshwaran - AI/ML Engineer
