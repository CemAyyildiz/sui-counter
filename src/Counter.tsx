import {
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiObjectData } from "@mysten/sui/client";
import { Button, Flex, Heading, Text, Card, Box } from "@radix-ui/themes";
import { Calendar, User, Hash, Image as ImageIcon } from "lucide-react";
import ClipLoader from "react-spinners/ClipLoader";

export function NftInfo({ id, onOldCounter }: { id: string, onOldCounter?: () => void }) {
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
    <Flex direction="column" gap="6" style={{ maxWidth: 600, margin: "0 auto", padding: "24px" }}>
      <Card style={{ 
        padding: "32px", 
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
        border: "1px solid rgba(102, 126, 234, 0.2)"
      }}>
        <Flex direction="column" align="center" gap="4">
          <Heading size="6" align="center" style={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "16px"
          }}>
            🎨 {fields?.name || "NFT Detayları"}
          </Heading>

          {fields?.image_url && (
            <Box style={{ position: "relative", marginBottom: "24px" }}>
              <img
                src={fields.image_url}
                alt={fields?.name || `NFT`}
                style={{ 
                  width: "300px", 
                  height: "300px", 
                  objectFit: "cover", 
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const errorDiv = document.getElementById("img-error");
                  if (errorDiv) errorDiv.style.display = "block";
                }}
              />
              <div id="img-error" style={{ 
                display: "none", 
                color: "#ef4444", 
                textAlign: "center",
                padding: "60px 20px",
                border: "2px dashed #ef4444",
                borderRadius: "12px"
              }}>
                <ImageIcon size={48} style={{ margin: "0 auto 16px", display: "block" }} />
                Görsel yüklenemedi
              </div>
            </Box>
          )}

          {fields?.description && (
            <Text size="3" align="center" style={{ 
              marginBottom: "24px", 
              lineHeight: "1.6",
              color: "var(--gray-11)"
            }}>
              {fields.description}
            </Text>
          )}
        </Flex>
      </Card>

      {/* NFT Details Card */}
      <Card style={{ padding: "24px" }}>
        <Flex direction="column" gap="4">
          <Heading size="4" style={{ marginBottom: "16px", color: "#667eea" }}>
            📋 NFT Bilgileri
          </Heading>
          
          <Flex align="center" gap="3">
            <User size={18} color="#667eea" />
            <Box>
              <Text size="2" color="gray">Yaratıcı</Text>
              <Text size="3" style={{ fontFamily: "monospace" }}>
                {fields?.owner}
              </Text>
            </Box>
          </Flex>

          {fields?.mint_timestamp && (
            <Flex align="center" gap="3">
              <Calendar size={18} color="#667eea" />
              <Box>
                <Text size="2" color="gray">Oluşturulma Tarihi</Text>
                <Text size="3">
                  {new Date(parseInt(fields.mint_timestamp)).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </Box>
            </Flex>
          )}

          <Flex align="center" gap="3">
            <Hash size={18} color="#667eea" />
            <Box style={{ flex: 1 }}>
              <Text size="2" color="gray">NFT ID</Text>
              <Text size="2" style={{ 
                fontFamily: "monospace", 
                wordBreak: "break-all",
                background: "rgba(102, 126, 234, 0.1)",
                padding: "4px 8px",
                borderRadius: "4px",
                marginTop: "4px",
                display: "block"
              }}>
                {id}
              </Text>
            </Box>
          </Flex>
        </Flex>
      </Card>

      {/* Action Button */}
      <Button
        onClick={() => {
          window.location.hash = "";
          if (onOldCounter) onOldCounter();
        }}
        variant="outline"
        size="3"
        style={{ marginTop: "16px" }}
      >
        🔙 Yeni NFT Oluştur
      </Button>
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
      name: undefined,
      description: undefined,
      image_url: undefined,
      mint_timestamp: undefined,
    };
  }
  
  // Yeni ImageNFT ise
  if (fields.name !== undefined && fields.creator !== undefined) {
    return {
      isOldCounter: false,
      owner: fields.creator,
      name: fields.name,
      description: fields.description,
      image_url: fields.image_url,
      mint_timestamp: fields.mint_timestamp,
    };
  }
  
  // Eski NFT formatı (mint_index ile)
  if (fields.mint_index !== undefined && fields.owner !== undefined) {
    let image_url;
    if (fields.image_url) {
      // vector<u8> -> string dönüşümü gerekirse
      if (Array.isArray(fields.image_url)) {
        image_url = new TextDecoder().decode(new Uint8Array(fields.image_url));
      } else {
        image_url = fields.image_url;
      }
    }
    return {
      isOldCounter: false,
      owner: fields.owner,
      name: `NFT #${fields.mint_index}`,
      description: "Legacy NFT",
      image_url,
      mint_timestamp: undefined,
    };
  }
  
  return null;
}
