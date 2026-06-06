# TESTING.md - Test Strategy & Validation Scenarios

This document outlines the test scenarios executed to verify the core functional, security, and edge-case behaviors of the Meeting Intelligence Service.

---

## 1. Test Scenarios Executed

### Scenario A: Register & Authentic Login
*   **Method**: Tested registering a new account and then logging in under `/api/auth/login`.
*   **Result**: Succeeded. Returned `{ success: true, data: { user: { id, email }, token } }` where the token is verified as a valid JWT. Backed passwords are secure SHA-256 hashes.

### Scenario B: Adding Meetings with Validations
*   **Method**: Tested submitting meeting transcripts under `POST /api/meetings` with valid and invalid payloads.
*   **Result**:
    *   Valid: HTTP 201 with stored meeting JSON.
    *   Missing Title: HTTP 400 returned `{ success: false, error: { code: 'VALIDATION_ERROR', message: 'Meeting title is required...' } }`.
    *   Malformed Participant Email Address: HTTP 400 with relevant error details.

### Scenario C: Pagination Range Retrieval
*   **Method**: Tested requesting `GET /api/meetings?page=1&limit=2`.
*   **Result**: Returned paginated meetings with pagination metainfo count matching the spec:
    ```json
    {
      "success": true,
      "data": {
        "meetings": [...],
        "pagination": { "total": 1, "page": 1, "limit": 2, "totalPages": 1 }
      }
    }
    ```

### Scenario D: AI Analysis Grounded citation
*   **Method**: Triggered `POST /api/meetings/:id/analyze` on both online (Gemini client) and offline fallback pipelines.
*   **Result**: Succeeded. Re-checked all citations against transcript timestamps. Verified that action items were automatically created, logged, and tracked as follow-up action items under `/api/action-items` inside the database.

---

## 2. Edge Case Validations

*   **Action Item Date limits**: Verified that overdue action item filtering catches items where `status !== 'COMPLETED'` and the date is smaller than now. Tested with our seeded action item (`act_001`, deadline is May 25, 2026), and verified it returns in `GET /api/action-items/overdue`.
*   **Traceability Assertions**: Verified that all responses feature the `X-Trace-Id` header (either forwarded from client headers or generated dynamically) and verified that this trace log matches the `traceId` inside JSON bodies.
*   **Unauthorized Request Guarding**: Verified that requesting custom endpoints without a valid authorization token returns a strict `{ success: false, error: { code: 'UNAUTHORIZED' } }` response.
