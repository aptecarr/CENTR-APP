# Security Specification - ЦЕНТР (Нове Життя)

## Data Invariants
1. A report must always be linked to a valid patient and a mentor.
2. Finance records can only be created by Admins or Senior Mentors.
3. Messages in a chat channel are only accessible to staff.
4. Patient PII is only visible to their assigned mentor and admins.

## The Dirty Dozen Payloads (Target: Denied)
1. User trying to update their own role to 'Admin'.
2. Non-mentor trying to read a patient's private notes.
3. Creating a report for a non-existent patient.
4. Deleting a financial record by a regular staff member.
5. Injected 1MB string into a chat message.
6. Spoofing `authorId` in a chat message.
7. Modifying `admissionDate` of a patient after creation.
8. Listing all users without being authenticated.
9. Creating a user profile with an email that doesn't match the auth token.
10. Updating a closed report's terminal state.
11. Injecting special characters into a document ID.
12. Reading PII without email verification.

## Test Runner (Draft)
- `test('admin can see everything')`
- `test('mentor can see their patients')`
- `test('staff cannot see private patient info')`
- `test('cannot spoof author uid in message')`
