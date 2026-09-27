"""HTTP helpers shared by API tests. Each `signup` returns its own client
(own cookie jar), so a test can act as several different users.
"""

from dataclasses import dataclass

from fastapi.testclient import TestClient


@dataclass
class Person:
    client: TestClient
    account_id: int
    name: str

    def balance(self) -> int:
        return self.client.get("/me/account").json()["balance"]

    def deposit(self, amount: int, key: str, tag: str | None = None):
        return self.client.post(
            "/movements/deposit",
            json={"amount": amount, "tag": tag},
            headers={"Idempotency-Key": key},
        )

    def transfer(self, to: "Person | int", amount: int, key: str, **extra):
        to_id = to.account_id if isinstance(to, Person) else to
        return self.client.post(
            "/movements/transfer",
            json={"to_account_id": to_id, "amount": amount, **extra},
            headers={"Idempotency-Key": key},
        )

    def create_expense(self, shares: list[tuple["Person | int", int]], **extra):
        return self.client.post(
            "/expenses",
            json={
                "shares": [
                    {
                        "account_id": p.account_id if isinstance(p, Person) else p,
                        "amount_owed": amount,
                    }
                    for p, amount in shares
                ],
                **extra,
            },
        )

    def settle(self, expense_id: int, share_id: int):
        return self.client.post(f"/expenses/{expense_id}/shares/{share_id}/settle")


def signup(make_client, name: str) -> Person:
    client = make_client()
    body = client.post(
        "/auth/register",
        json={
            "name": name,
            "email": f"{name.lower()}@example.com",
            "password": "clave-segura-1",
        },
    ).json()
    return Person(client=client, account_id=body["account_id"], name=name)
