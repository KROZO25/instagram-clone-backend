from google.oauth2 import service_account
from google.cloud import firestore_admin_v1
from google.cloud.firestore_admin_v1.types.index import Index

# 1. Load credentials
creds = service_account.Credentials.from_service_account_file(
    'serviceAccountKey.json',
    scopes=['https://www.googleapis.com/auth/datastore']
)

# 2. Build the Admin client
client = firestore_admin_v1.FirestoreAdminClient(credentials=creds)

# 3. Parent path for your Post collection-group
parent = 'projects/ig-clone-backend-458508/databases/(default)/collectionGroups/Post'

# 4. Define your composite index
index_proto = Index(
    query_scope=Index.QueryScope.COLLECTION,
    fields=[
        Index.IndexField(field_path='Author',    order=Index.IndexField.Order.ASCENDING),
        Index.IndexField(field_path='CreatedAt', order=Index.IndexField.Order.DESCENDING),
    ]
)

# 5. Create it
operation = client.create_index(parent=parent, index=index_proto)

# 6. Print the name from the underlying proto
print(f'Index creation started: {operation.operation.name}')
