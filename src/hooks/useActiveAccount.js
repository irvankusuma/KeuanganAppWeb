import { useEffect, useState } from "react";
import * as Accounts from "../services/AccountService";

export default function useActiveAccount() {
  const [account, setAccount] = useState(() => Accounts.getActive());

  useEffect(() => {
    const refresh = () => setAccount(Accounts.getActive());
    window.addEventListener("kua:account-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("kua:account-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return account;
}
