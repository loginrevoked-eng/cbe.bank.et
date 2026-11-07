from typing import Optional

from pydantic import BaseModel, Field


class AccountLookupAutocompleteRequest(BaseModel):
    request_id: int = Field(ge=1)
    account: Optional[str] = None
    name: Optional[str] = None
    max_accs: int = Field(default=10, ge=1, le=100)


class AccountLookupAutocompleteUser(BaseModel):
    userid: str
    first_name: str
    last_name: str
    full_name: str
    account: str


class AccountLookupResult(BaseModel):
    found: int
    users: list[AccountLookupAutocompleteUser]


class AccountLookupAutocompleteResponse(BaseModel):
    request_id: int
    lookup_result: AccountLookupResult
