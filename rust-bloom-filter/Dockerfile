# Build Stage
FROM rust:1.75-slim as builder
WORKDIR /usr/src/app
COPY . .
RUN cargo build --release

# Runtime Stage
FROM debian:bookworm-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/target/release/fraud-bloom-filter .

EXPOSE 8080
CMD ["./fraud-bloom-filter"]
