import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Heading, Text, TextField, TextArea, Card, Box } from "@radix-ui/themes";
import { Upload, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, Palette } from "lucide-react";
import { useNetworkVariable } from "./networkConfig";
import ClipLoader from "react-spinners/ClipLoader";

interface NFTMinterProps {
  onMinted?: (nftId: string) => void;
}

export function NFTMinter({ onMinted }: NFTMinterProps) {
  const currentAccount = useCurrentAccount();
  const counterPackageId = useNetworkVariable("counterPackageId");
  const collectionId = useNetworkVariable("collectionId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pixelatedPreview, setPixelatedPreview] = useState<string | null>(null);
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [isPixelating, setIsPixelating] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [pixelStatus, setPixelStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pixelatedImageUrl, setPixelatedImageUrl] = useState<string>("");
  const [pixelSize, setPixelSize] = useState(16); // Pixel boyutu (8, 16, 32, 64)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setPixelatedPreview(null);
        setPixelStatus('idle');
        setPixelatedImageUrl("");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const createPixelArt = useCallback(async (file: File): Promise<string> => {
    setIsPixelating(true);
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Orijinal görsel boyutları (şu anda kullanılmıyor ama gelecekte gerekebilir)
          
          // Pixel art için küçük boyut (16x16, 32x32, 64x64)
          const currentPixelSize = pixelSize; // Güncel pixel boyutunu kullan
          const pixelWidth = currentPixelSize;
          const pixelHeight = currentPixelSize;
          
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
          
          // Görseli canvas'a çiz ve pixel art efekti uygula
          ctx.imageSmoothingEnabled = false; // Pixel art için smooth'u kapat
          ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
          
          // Şimdi büyük boyutta göster (pixel'ları belirgin yap)
          const displayCanvas = document.createElement('canvas');
          const displayCtx = displayCanvas.getContext('2d');
          
          if (!displayCtx) {
            reject(new Error('Display canvas context not available'));
            return;
          }
          
          // Display canvas'ı büyük yap (pixel'ları görmek için)
          // 16KB limit için daha küçük boyut kullan
          const displaySize = 128; // 256'dan 128'e düşürdük
          displayCanvas.width = displaySize;
          displayCanvas.height = displaySize;
          
          // Smooth'u kapat ve pixel art'ı büyüt
          displayCtx.imageSmoothingEnabled = false;
          displayCtx.drawImage(canvas, 0, 0, displaySize, displaySize);
          
          // Base64'e çevir - JPEG formatında düşük kalite ile boyutu azalt
          const base64 = displayCanvas.toDataURL('image/jpeg', 0.5); // %50 kalite
          
          // Boyut kontrolü - 16KB limitini aşmamak için
          if (base64.length > 16000) { // 16KB'dan biraz küçük tutuyoruz
            // Daha da küçük boyut ve kalite ile tekrar dene
            const smallCanvas = document.createElement('canvas');
            const smallCtx = smallCanvas.getContext('2d');
            
            if (smallCtx) {
              const smallSize = 64; // 64x64 boyutuna düşür
              smallCanvas.width = smallSize;
              smallCanvas.height = smallSize;
              
              smallCtx.imageSmoothingEnabled = false;
              smallCtx.drawImage(canvas, 0, 0, smallSize, smallSize);
              
              const smallBase64 = smallCanvas.toDataURL('image/jpeg', 0.3); // %30 kalite
              resolve(smallBase64);
              return;
            }
          }
          
          setTimeout(() => {
            resolve(base64);
          }, 1000); // 1 saniye bekleme simülasyonu
        };
        
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      throw error;
    } finally {
      setIsPixelating(false);
    }
  }, [pixelSize]); // pixelSize dependency'si eklendi

  // Pixel boyutu değiştiğinde otomatik olarak pixel art'ı yeniden oluştur
  const regeneratePixelArt = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      setIsPixelating(true);
      const pixelatedUrl = await createPixelArt(selectedFile);
      setPixelatedImageUrl(pixelatedUrl);
      setPixelatedPreview(pixelatedUrl);
      setPixelStatus('success');
    } catch (error) {
      console.error('Pixel art regeneration failed:', error);
      setPixelStatus('error');
    } finally {
      setIsPixelating(false);
    }
  }, [selectedFile, createPixelArt]);

  // Pixel boyutu değiştiğinde veya yeni görsel yüklendiğinde otomatik olarak yeniden oluştur
  useEffect(() => {
    if (selectedFile) {
      regeneratePixelArt();
    }
  }, [pixelSize, selectedFile, regeneratePixelArt]);

  const handlePixelate = async () => {
    if (!selectedFile) return;
    
    try {
      const pixelatedUrl = await createPixelArt(selectedFile);
      setPixelatedImageUrl(pixelatedUrl);
      setPixelatedPreview(pixelatedUrl);
      setPixelStatus('success');
    } catch (error) {
      console.error('Pixelation failed:', error);
      setPixelStatus('error');
    }
  };

  const handleMint = async () => {
    if (!currentAccount || !pixelatedImageUrl || !nftName.trim()) return;

    setIsMinting(true);
    
    const tx = new Transaction();
    
    // Collection ID'yi kullan (artık deploy edilmiş durumda)
    const finalCollectionId = collectionId;
    
    tx.moveCall({
      target: `${counterPackageId}::nft_minter::mint_image_nft`,
      arguments: [
        tx.object(finalCollectionId),
        tx.pure.string(nftName),
        tx.pure.string(nftDescription || "Kullanıcı tarafından oluşturulan Pixel Art NFT"),
        tx.pure.string(pixelatedImageUrl),
      ],
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log("NFT minted successfully!", result);
          try {
            // Transaction'ı bekle ve created object'leri al
            const txResult = await suiClient.waitForTransaction({
              digest: result.digest,
              options: {
                showEffects: true,
                showObjectChanges: true,
              },
            });
            
            // Created object'lerden NFT'yi bul
            const createdNFT = txResult.effects?.created?.find((obj: any) => 
              obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner
            );
            
            if (createdNFT && onMinted) {
              onMinted(createdNFT.reference.objectId);
            } else if (onMinted) {
              // Fallback olarak transaction digest'ini kullan
              onMinted(result.digest);
            }
          } catch (error) {
            console.error("Error getting NFT ID:", error);
            if (onMinted) {
              onMinted(result.digest);
            }
          }
          // Reset form
          setSelectedFile(null);
          setImagePreview(null);
          setPixelatedPreview(null);
          setNftName("");
          setNftDescription("");
          setPixelatedImageUrl("");
          setPixelStatus('idle');
        },
        onError: (error) => {
          console.error("Minting failed:", error);
        },
        onSettled: () => {
          setIsMinting(false);
        },
      }
    );
  };

  return (
    <Flex direction="column" gap="6" style={{ maxWidth: 800, margin: "0 auto", padding: "24px" }}>
      <Heading size="6" align="center" style={{ 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: "8px"
      }}>
        🎨 Pixel Art NFT Oluşturucu
      </Heading>
      
      <Text size="3" align="center" color="gray" style={{ marginBottom: "24px" }}>
        Görselinizi yükleyin ve pixel art NFT'nizi oluşturun
      </Text>

      {/* File Upload Area */}
      <Card style={{ padding: "24px" }}>
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? '#667eea' : '#e1e5e9'}`,
            borderRadius: "12px",
            padding: "40px 20px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: isDragActive ? "rgba(102, 126, 234, 0.05)" : "transparent",
            transition: "all 0.3s ease"
          }}
        >
          <input {...getInputProps()} />
          
          {imagePreview ? (
            <Flex direction="column" align="center" gap="3">
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxWidth: "200px", 
                  maxHeight: "200px", 
                  borderRadius: "8px",
                  objectFit: "contain"
                }} 
              />
              <Text size="2" color="green">
                <CheckCircle size={16} style={{ display: "inline", marginRight: "4px" }} />
                Görsel seçildi
              </Text>
              <Text size="1" color="gray">{selectedFile?.name}</Text>
            </Flex>
          ) : (
            <Flex direction="column" align="center" gap="3">
              <Upload size={48} color="#667eea" />
              <Text size="4" weight="medium">
                {isDragActive ? "Görseli buraya bırakın" : "Görsel yüklemek için tıklayın veya sürükleyin"}
              </Text>
              <Text size="2" color="gray">
                PNG, JPG, GIF desteklenir
              </Text>
            </Flex>
          )}
        </div>
      </Card>

      {/* Pixel Size Selection */}
      {selectedFile && (
        <Card style={{ padding: "20px" }}>
          <Flex direction="column" gap="3">
            <Text size="3" weight="medium" align="center">
              🎯 Pixel Boyutu Seçin
            </Text>
            <Flex justify="center" gap="2">
              {[8, 16, 32, 64].map((size) => (
                <Button
                  key={size}
                  variant={pixelSize === size ? "solid" : "outline"}
                  size="2"
                  onClick={() => setPixelSize(size)}
                  disabled={isPixelating}
                  style={{
                    background: pixelSize === size ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                    border: pixelSize === size ? "none" : "1px solid #e1e5e9",
                    color: pixelSize === size ? "white" : "#667eea"
                  }}
                >
                  {size}x{size}
                </Button>
              ))}
            </Flex>
            <Text size="1" color="gray" align="center">
              {pixelStatus === 'success' ? 'Boyutu değiştirerek farklı pixel art efektlerini deneyin!' : 'Daha küçük boyut = daha pixelated görünüm'}
            </Text>
            {pixelStatus === 'success' && isPixelating && (
              <Flex align="center" justify="center" gap="2" style={{ color: "#667eea" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                <Text size="1">Yeni boyut oluşturuluyor...</Text>
              </Flex>
            )}
          </Flex>
        </Card>
      )}

      {/* Create Pixel Art Button */}
      {selectedFile && pixelStatus === 'idle' && (
        <Button 
          onClick={handlePixelate}
          disabled={isPixelating}
          size="3"
          style={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none"
          }}
        >
          {isPixelating ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: "8px" }} />
              Pixel Art Oluşturuluyor...
            </>
          ) : (
            <>
              <Palette size={16} style={{ marginRight: "8px" }} />
              Pixel Oluştur
            </>
          )}
        </Button>
      )}

      {/* Pixelation Status */}
      {pixelStatus === 'success' && (
        <Flex align="center" justify="center" gap="2" style={{ color: "#10b981" }}>
          <CheckCircle size={16} />
          <Text size="2">Pixel art başarıyla oluşturuldu!</Text>
        </Flex>
      )}

      {pixelStatus === 'error' && (
        <Flex align="center" justify="center" gap="2" style={{ color: "#ef4444" }}>
          <AlertCircle size={16} />
          <Text size="2">Pixel art oluşturulamadı. Tekrar deneyin.</Text>
        </Flex>
      )}

      {/* Pixel Art Preview */}
      {pixelStatus === 'success' && pixelatedPreview && (
        <Card style={{ padding: "24px" }}>
          <Flex direction="column" gap="4">
            <Text size="4" weight="medium" align="center" color="indigo">
              🎨 NFT Önizlemesi
            </Text>
            <Flex justify="center" gap="6" wrap="wrap">
              <Flex direction="column" align="center" gap="2">
                <Text size="2" color="gray">Orijinal Görsel</Text>
                <img 
                  src={imagePreview!} 
                  alt="Original" 
                  style={{ 
                    width: "120px", 
                    height: "120px", 
                    borderRadius: "8px",
                    objectFit: "cover"
                  }} 
                />
              </Flex>
              <Flex direction="column" align="center" gap="2">
                <Text size="2" color="gray">Pixel Art NFT</Text>
                <img 
                  src={pixelatedPreview} 
                  alt="Pixelated" 
                  style={{ 
                    width: "120px", 
                    height: "120px", 
                    borderRadius: "8px",
                    objectFit: "cover"
                  }} 
                />
                <Text size="1" color="gray">{pixelSize}x{pixelSize} → 128x128 (16KB limit)</Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* NFT Metadata Form */}
      {pixelStatus === 'success' && (
        <Card style={{ padding: "24px" }}>
          <Flex direction="column" gap="4">
            <Box>
              <Text size="3" weight="medium" style={{ marginBottom: "8px", display: "block" }}>
                NFT Adı *
              </Text>
              <TextField.Root
                placeholder="Örn: Pixel Manzara #1"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                size="3"
              />
            </Box>

            <Box>
              <Text size="3" weight="medium" style={{ marginBottom: "8px", display: "block" }}>
                Açıklama
              </Text>
              <TextArea
                placeholder="NFT'niz hakkında açıklama yazın..."
                value={nftDescription}
                onChange={(e) => setNftDescription(e.target.value)}
                rows={3}
                resize="vertical"
              />
            </Box>

            <Button
              onClick={handleMint}
              disabled={!nftName.trim() || isMinting}
              size="3"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                marginTop: "16px"
              }}
            >
              {isMinting ? (
                <>
                  <ClipLoader size={16} color="#fff" style={{ marginRight: "8px" }} />
                  NFT Oluşturuluyor...
                </>
              ) : (
                <>
                  <ImageIcon size={16} style={{ marginRight: "8px" }} />
                  Pixel Art NFT Oluştur
                </>
              )}
            </Button>
          </Flex>
        </Card>
      )}

      {/* Info Card */}
      <Card style={{ padding: "20px", background: "rgba(102, 126, 234, 0.05)" }}>
        <Flex direction="column" gap="2">
          <Text size="3" weight="medium" color="indigo">
            💡 Nasıl Çalışır?
          </Text>
          <Text size="2" color="gray">
            1. Bilgisayarınızdan bir görsel seçin
          </Text>
          <Text size="2" color="gray">
            2. Pixel boyutunu seçin (8x8, 16x16, 32x32, 64x64)
          </Text>
          <Text size="2" color="gray">
            3. "Pixel Oluştur" butonuna tıklayın
          </Text>
          <Text size="2" color="gray">
            4. Görsel otomatik olarak 16KB limitine uygun hale getirilir
          </Text>
          <Text size="2" color="gray">
            5. NFT bilgilerini doldurun
          </Text>
          <Text size="2" color="gray">
            6. Pixel art NFT'nizi oluşturun ve cüzdanınıza alın!
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
