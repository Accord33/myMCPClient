from setuptools import setup, find_packages

setup(
    name="myMCPClient-backend",
    version="0.1.0",
    packages=["backend", "pymcpservers"],
    install_requires=[
        "fastapi>=0.115.11",
        "jinja2>=3.1.6",
        "langchain>=0.3.21",
        "langchain-anthropic>=0.3.10",
        "langchain-mcp-adapters>=0.0.5",
        "langgraph>=0.3.18",
        "uvicorn>=0.20.0",
        "pydantic>=2.0.0",
        "python-dotenv>=1.0.0",
        "mcp>=0.1.0",
        "httpx>=0.24.0",
    ],
    python_requires=">=3.10",
)
