import { Transaction } from "@mysten/sui/transactions";
import { Button, Container } from "@radix-ui/themes";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
import { DEVNET_SUPPLY_ID, TESTNET_SUPPLY_ID, MAINNET_COUNTER_PACKAGE_ID, DEVNET_COUNTER_PACKAGE_ID, TESTNET_COUNTER_PACKAGE_ID } from "./constants";
import ClipLoader from "react-spinners/ClipLoader";
import { useState } from "react";

export function MintNft({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const counterPackageId = useNetworkVariable("counterPackageId");
  const suiClient = useSuiClient();
  const {
    mutate: signAndExecute,
    isSuccess,
    isPending,
    isError,
    error,
  } = useSignAndExecuteTransaction();
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState(false);

  function mint() {
    setTxError(null);
    setTxSuccess(false);
    const tx = new Transaction();
    let supplyId: string | undefined;
    if (counterPackageId === DEVNET_COUNTER_PACKAGE_ID) {
      supplyId = DEVNET_SUPPLY_ID;
    } else if (counterPackageId === TESTNET_COUNTER_PACKAGE_ID) {
      supplyId = TESTNET_SUPPLY_ID;
    } else if (counterPackageId === MAINNET_COUNTER_PACKAGE_ID) {
      const input = window.prompt("Supply nesnesinin ID'sini girin (ilk deployda init_supply ile oluşturulmalı):");
      supplyId = input === null ? undefined : input;
    }
    if (!supplyId) return;
    tx.moveCall({
      arguments: [tx.object(supplyId)],
      target: `${counterPackageId}::counter::mint`,
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async ({ digest }) => {
          const { effects } = await suiClient.waitForTransaction({
            digest: digest,
            options: {
              showEffects: true,
            },
          });
          const created = effects?.created?.find((c: any) => c.owner?.AddressOwner);
          if (created) {
            setTxSuccess(true);
            onCreated(created.reference.objectId);
          }
        },
        onError: (err) => {
          setTxError(err.message || "Mint işlemi başarısız oldu.");
        },
      },
    );
  }

  return (
    <Container>
      <Button
        size="3"
        onClick={() => {
          mint();
        }}
        disabled={isSuccess || isPending}
      >
        {isSuccess || isPending ? <ClipLoader size={20} /> : "NFT Mintle"}
      </Button>
      {txError && (
        <div style={{ color: "red", marginTop: 12 }}>{txError}</div>
      )}
      {txSuccess && (
        <div style={{ color: "green", marginTop: 12 }}>Mint işlemi başarılı!</div>
      )}
    </Container>
  );
}
