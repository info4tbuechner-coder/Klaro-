# Security Specification for Klaro Financial Intelligence

## 1. Data Invariants
- **User Profile Invariant**: A user document at `/users/{userId}` can only be read and written by the authenticated user whose `request.auth.uid == userId`.
- **Transaction Subcollection Invariant**: Transactions at `/users/{userId}/transactions/{transactionId}` belong strictly to `{userId}`.
- **Identity Invariant**: `userId` in `request.resource.data` must strictly match `request.auth.uid`.

## 2. The "Dirty Dozen" Payloads
1. Unauthenticated read of user profile.
2. Unauthenticated write of transaction.
3. Authenticated user A reading user B's profile.
4. Authenticated user A writing to user B's transaction subcollection.
5. Creating a transaction with `userId` mismatched to `request.auth.uid`.
6. Creating a transaction with invalid ID characters (`../../../hack`).
7. Creating a transaction with oversized description field (> 1000 characters).
8. Creating a user profile with invalid email type (number instead of string).
9. Updating `userId` field after creation (immutable field change).
10. Creating transaction with amount as a string instead of number.
11. Reading user list without authentication.
12. Creating more than allowed fields in transaction payload (shadow fields).

## 3. Test Runner Specification
The test runner validates these 12 invariants using `@firebase/rules-unit-testing` ensuring all unauthorized access returns `PERMISSION_DENIED`.
