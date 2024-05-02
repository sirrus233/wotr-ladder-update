from google.auth import credentials

class Credentials(credentials.ReadOnlyScoped, credentials.CredentialsWithQuotaProject):
    ...
