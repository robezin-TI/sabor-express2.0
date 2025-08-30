FROM python:3.11-slim

WORKDIR /app

# system deps required by osmnx (for Debian-based images)
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    libgeos-dev \
    libspatialindex-dev \
    proj-bin \
    libproj-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
