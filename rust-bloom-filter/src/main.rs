use axum::{
    routing::{get, post},
    Router, Json, extract::State,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use bloomfilter::Bloom;
use tokio::net::TcpListener;

// 1 Million items, 0.001 false positive rate
const EXPECTED_ITEMS: usize = 1_000_000;
const FALSE_POSITIVE_RATE: f64 = 0.001;

#[derive(Clone)]
struct AppState {
    // Thread-safe Bloom Filter wrapped in Arc<Mutex>
    filter: Arc<Mutex<Bloom<String>>>,
}

#[derive(Deserialize)]
struct BloomRequest {
    key: String,
}

#[derive(Serialize)]
struct BloomResponse {
    might_contain: bool,
}

#[tokio::main]
async fn main() {
    println!("🦀 Starting Rust High-Performance Bloom Filter Service...");
    println!("Allocating filter for {} items...", EXPECTED_ITEMS);

    let state = AppState {
        filter: Arc::new(Mutex::new(Bloom::new_for_fp_rate(EXPECTED_ITEMS, FALSE_POSITIVE_RATE))),
    };

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/check", post(check_key))
        .route("/add", post(add_key))
        .with_state(state);

    let listener = TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("🚀 Listening on port 8080");
    
    axum::serve(listener, app).await.unwrap();
}

/// O(1) Check if the key might exist in the filter
async fn check_key(
    State(state): State<AppState>,
    Json(payload): Json<BloomRequest>,
) -> Json<BloomResponse> {
    let filter = state.filter.lock().unwrap();
    let might_contain = filter.check(&payload.key);
    
    Json(BloomResponse { might_contain })
}

/// O(1) Add key to the filter
async fn add_key(
    State(state): State<AppState>,
    Json(payload): Json<BloomRequest>,
) -> Json<BloomResponse> {
    let mut filter = state.filter.lock().unwrap();
    filter.set(&payload.key);
    
    Json(BloomResponse { might_contain: true })
}
