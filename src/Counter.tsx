import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiObjectData } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

export function NftInfo({ id, onOldCounter }: { id: string, onOldCounter?: () => void }) {
  const counterPackageId = useNetworkVariable("counterPackageId");
  const { data, isPending, error } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  if (isPending)
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <ClipLoader size={32} />
        <Text ml="3" size="4" color="gray">
          Yükleniyor...
        </Text>
      </Flex>
    );

  if (error)
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Text color="red" size="4">
          Hata: {error.message}
        </Text>
      </Flex>
    );

  if (!data.data)
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Text color="gray" size="4">
          NFT bulunamadı
        </Text>
      </Flex>
    );

  const fields = getNftFields(data.data);

  if (!fields) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Text color="red" size="4">
          Geçersiz veya tanımsız obje yapısı. Lütfen yeni NFT mintleyin.
        </Text>
      </Flex>
    );
  }

  if (fields.isOldCounter) {
    if (onOldCounter) onOldCounter();
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Text color="orange" size="4" align="center">
          Bu obje eski sayaç kontratına ait. Yeni NFT kontratı ile mintleyin.<br />
          Sahip: {fields.owner}
        </Text>
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{
        background: "var(--gray-2, #18181b)",
        borderRadius: 16,
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
        padding: 32,
        minWidth: 340,
        maxWidth: 400,
        margin: "32px auto",
      }}
      gap="4"
    >
      <Heading size="5" align="center" style={{ letterSpacing: 1, marginBottom: 8 }}>
        NFT Bilgisi
      </Heading>
      <Text size="7" weight="bold" align="center" style={{ margin: "16px 0", fontVariantNumeric: "tabular-nums" }}>
        Mint Sırası: {fields?.mint_index}
      </Text>
      <Text size="4" align="center" style={{ margin: "8px 0" }}>
        Sahip: {fields?.owner}
      </Text>
      {fields?.image_url && (
        <>
          <img
            src={fields.image_url}
            alt={`Mint Sırası ${fields.mint_index}`}
            style={{ width: 200, height: 200, objectFit: "contain", margin: "16px 0" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const errorDiv = document.getElementById("img-error");
              if (errorDiv) errorDiv.style.display = "block";
            }}
          />
          <div id="img-error" style={{ display: "none", color: "red", marginBottom: 8 }}>
            Görsel yüklenemedi.
          </div>
          <Text size="1" color="gray" style={{ marginTop: 4, wordBreak: "break-all" }}>
            Görsel URL: {fields.image_url}
          </Text>
        </>
      )}
      <Text size="2" color="gray" style={{ marginTop: 16, wordBreak: "break-all" }}>
        NFT ID: {id}
      </Text>
    </Flex>
  );
}

function getNftFields(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }
  const fields = data.content.fields as any;
  // Eski Counter objesi ise
  if (fields.value !== undefined && fields.owner !== undefined) {
    return {
      isOldCounter: true,
      owner: fields.owner,
      mint_index: undefined,
      image_url: undefined,
    };
  }
  // Yeni NFT ise
  if (fields.mint_index !== undefined && fields.owner !== undefined) {
    let image_url;
    if (fields.image_url) {
      // vector<u8> -> string
      image_url = new TextDecoder().decode(fields.image_url);
    }
    return {
      isOldCounter: false,
      owner: fields.owner,
      mint_index: fields.mint_index,
      image_url,
    };
  }
  return null;
}
