import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { useState } from "react";
import { NftInfo } from "./Counter";
import { MintNft } from "./CreateCounter";

function App() {
  const currentAccount = useCurrentAccount();
  const [nftId, setNftId] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });

  // Eski kontrat tespitinde hash'i temizle
  const handleOldCounter = () => {
    window.location.hash = "";
    setNftId(null);
  };

  return (
    <>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
        }}
      >
        <Box>
          <Heading>dApp Starter Template</Heading>
        </Box>

        <Box>
          <ConnectButton />
        </Box>
      </Flex>
      <Container>
        <Container
          mt="5"
          pt="2"
          px="4"
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          {currentAccount ? (
            nftId ? (
              <NftInfo id={nftId} onOldCounter={handleOldCounter} />
            ) : (
              <MintNft
                onCreated={(id) => {
                  window.location.hash = id;
                  setNftId(id);
                }}
              />
            )
          ) : (
            <Heading>Please connect your wallet</Heading>
          )}
        </Container>
      </Container>
    </>
  );
}

export default App;
