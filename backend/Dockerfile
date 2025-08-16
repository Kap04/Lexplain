# First stage: Build environment
FROM registry.access.redhat.com/ubi9/python-311:latest AS builder

# Set working directory
WORKDIR /app

# Install system dependencies (using Red Hat's package manager)
USER root
RUN dnf install -y \
    gcc \
    python3-devel \
    mupdf-devel \
    && dnf clean all \
    && rm -rf /var/cache/dnf

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Second stage: Use Google's Distroless Python image
FROM gcr.io/distroless/python3:nonroot

# Copy Python packages and application from builder
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/lib/x86_64-linux-gnu/libmupdf.so* /usr/lib/x86_64-linux-gnu/
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose the port the app runs on
EXPOSE 8000

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
