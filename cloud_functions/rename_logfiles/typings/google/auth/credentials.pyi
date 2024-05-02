import abc

class Credentials(metaclass=abc.ABCMeta):
    ...

class CredentialsWithQuotaProject(Credentials):
    ...

class ReadOnlyScoped(metaclass=abc.ABCMeta):
    ...
