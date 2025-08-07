import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { useState } from "react";
import { NftInfo } from "./Counter";
import { NFTMinter } from "./NFTMinter";

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
          <Heading style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            🎨 NFT Creator
          </Heading>
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
              <NFTMinter
                onMinted={(id) => {
                  window.location.hash = id;
                  setNftId(id);
                }}
              />
            )
          ) : (
            <Flex 
              direction="column" 
              align="center" 
              justify="center" 
              gap="4"
              style={{ 
                minHeight: "60vh",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔐</div>
              <Heading size="6" style={{ marginBottom: "8px" }}>
                Cüzdanınızı Bağlayın
              </Heading>
              <Heading size="3" color="gray" weight="regular">
                NFT oluşturmak için önce cüzdanınızı bağlamanız gerekiyor
              </Heading>
              <Box mt="4">
                <ConnectButton />
              </Box>
            </Flex>
          )}
        </Container>
      </Container>
    </>
  );
}

export default App;
