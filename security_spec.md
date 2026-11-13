# Security Specification for Xiao Xue's Nine Palaces Spiritual Array

## 1. Data Invariants
- Each user can only read and write their own player profile document (`/users/{userId}`) where `userId == request.auth.uid`.
- Each user can only read and write their own level progress documents (`/users/{userId}/levelProgress/{levelId}`).
- A player cannot modify another player's cultivation data or spoof another player's UID.
- Subcollections must inherit ownership from the parent document path (`request.auth.uid == userId`).
- All incoming updates must be constrained to defined schema keys.

## 2. The "Dirty Dozen" Payloads (Expected to be DENIED)
1. Anonymous or unauthenticated write to `/users/{userId}` -> PERMISSION_DENIED.
2. User `bob` writing to `/users/alice` -> PERMISSION_DENIED.
3. User attempting to create `/users/{userId}` with `userId: "attacker"` mismatch -> PERMISSION_DENIED.
4. Ghost key injection into `/users/{userId}` (e.g. `isSuperAdmin: true`) -> PERMISSION_DENIED.
5. LevelProgress write where `userId` does not match authenticated user -> PERMISSION_DENIED.
6. LevelProgress write to another user's subcollection -> PERMISSION_DENIED.
7. Unauthenticated read of any user document -> PERMISSION_DENIED.
8. Unauthenticated list of `/users` collection -> PERMISSION_DENIED.
9. Malformed document ID with special characters / path traversal -> PERMISSION_DENIED.
10. Attempting to set `unlockedLevel` to negative or huge strings -> PERMISSION_DENIED.
11. User attempting to delete another player's level progress -> PERMISSION_DENIED.
12. Blanket list queries across all users without ownership filter -> PERMISSION_DENIED.
