FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libusb-1.0-0 \
    libbluetooth3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
COPY src/ src/

RUN pip install --no-cache-dir ".[test]"

EXPOSE 9999 5000 5002

CMD ["speculos-ble", "--transport", "vhci", "--verbose"]
