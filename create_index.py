from google.oauth2 import service_account
from googleapiclient.discovery import build

# 1. Load credentials
SERVICE_ACCOUNT_FILE = 'serviceAccountKey.json'
SCOPES = ['https://www.googleapis.com/auth/datastore']
creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)

# 2. Build v1 Admin client
service = build('firestore', 'v1', credentials=creds)

# 3. Set your project and collectionGroup
project_id = 'ig-clone-backend-458508'
parent = f'projects/{project_id}/databases/(default)/collectionGroups/Post'

# 4. Only the fields array is required
body = {
    "fields": [
        {"fieldPath": "Author",    "order": "ASCENDING"},
        {"fieldPath": "CreatedAt", "order": "DESCENDING"}
    ]
}

# 5. Create the index
request = service.projects().databases().collectionGroups().indexes().create(
    parent=parent,
    body=body
)
response = request.execute()
print("Index creation initiated:", response)
