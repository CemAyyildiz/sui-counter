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
    <Flex direction="column" gap="6" style={{ maxWidth: 900, margin: "0 auto", padding: "24px", position: "relative" }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      {/* Premium Header with Logos */}
      <Flex direction="column" align="center" gap="4" style={{ marginBottom: "32px" }}>
        {/* Main Title with Gradient */}
        <Heading size="8" align="center" style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "8px",
          fontWeight: "800",
          letterSpacing: "-0.02em"
        }}>
          🎨 Pixel Art NFT Creator
        </Heading>
        
        {/* Subtitle */}
        <Text size="4" align="center" color="gray" style={{ 
          marginBottom: "16px",
          fontWeight: "500",
          maxWidth: "600px"
        }}>
          Transform your images into stunning pixel art NFTs on the Sui blockchain
        </Text>

        {/* Logo Section */}
        <Flex align="center" gap="8" style={{ marginTop: "24px" }}>
          {/* Sui Logo */}
          <Flex align="center" gap="3" style={{
            background: "linear-gradient(135deg, #6fbcf0 0%, #4a90e2 100%)",
            padding: "16px 24px",
            borderRadius: "60px",
            boxShadow: "0 12px 40px rgba(111, 188, 240, 0.4)",
            border: "2px solid rgba(255, 255, 255, 0.2)"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <img 
                src="https://sui.io/favicon.ico" 
                alt="Sui Logo" 
                style={{ 
                  width: "24px", 
                  height: "24px",
                  borderRadius: "50%"
                }}
                onError={(e) => {
                  // Fallback to letter if image fails
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.innerHTML = "S";
                  fallback.style.color = "#4a90e2";
                  fallback.style.fontWeight = "bold";
                  fallback.style.fontSize = "18px";
                  (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                }}
              />
            </div>
            <Text size="4" weight="bold" style={{ color: "white" }}>Sui Network</Text>
          </Flex>

          {/* OverBlock Logo */}
          <Flex align="center" gap="3" style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "16px 24px",
            borderRadius: "60px",
            boxShadow: "0 12px 40px rgba(102, 126, 234, 0.4)",
            border: "2px solid rgba(255, 255, 255, 0.2)"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <img 
                src="https://overblock.io/favicon.ico" 
                alt="OverBlock Logo" 
                style={{ 
                  width: "24px", 
                  height: "24px",
                  borderRadius: "50%"
                }}
                onError={(e) => {
                  // Fallback to letter if image fails
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.innerHTML = "O";
                  fallback.style.color = "#667eea";
                  fallback.style.fontWeight = "bold";
                  fallback.style.fontSize = "18px";
                  (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                }}
              />
            </div>
            <Text size="4" weight="bold" style={{ color: "white" }}>OverBlock</Text>
          </Flex>
        </Flex>

        {/* Network Indicator */}
        <Flex align="center" justify="center" style={{ 
          marginTop: "16px",
          padding: "8px 16px",
          background: "rgba(16, 185, 129, 0.1)",
          borderRadius: "20px",
          border: "1px solid rgba(16, 185, 129, 0.2)"
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            background: "#10b981",
            borderRadius: "50%",
            marginRight: "8px",
            animation: "pulse 2s infinite"
          }} />
          <Text size="2" color="green" weight="medium">
            Connected to Sui Testnet
          </Text>
        </Flex>

        {/* Made by OverBlock Watermark */}
        <Text size="2" color="gray" align="center" style={{ 
          marginTop: "24px",
          opacity: 0.8,
          fontStyle: "italic",
          letterSpacing: "0.05em",
          background: "rgba(102, 126, 234, 0.1)",
          padding: "8px 16px",
          borderRadius: "20px",
          border: "1px solid rgba(102, 126, 234, 0.2)"
        }}>
          Made with ❤️ by OverBlock
        </Text>
      </Flex>

      {/* File Upload Area with Premium Design */}
      <Card style={{ 
        padding: "32px", 
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
        border: "1px solid rgba(102, 126, 234, 0.1)",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(102, 126, 234, 0.1)"
      }}>
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? '#667eea' : 'rgba(102, 126, 234, 0.3)'}`,
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: isDragActive ? "rgba(102, 126, 234, 0.08)" : "rgba(102, 126, 234, 0.02)",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Animated Background Pattern */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.03) 0%, transparent 50%)",
            pointerEvents: "none"
          }} />
          
          <input {...getInputProps()} />
          
          {imagePreview ? (
            <Flex direction="column" align="center" gap="4">
              <div style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
              }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    width: "200px", 
                    height: "200px", 
                    objectFit: "cover",
                    transition: "transform 0.3s ease"
                  }} 
                />
                <div style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "rgba(16, 185, 129, 0.9)",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backdropFilter: "blur(10px)"
                }}>
                  ✓ Selected
                </div>
              </div>
              <Text size="2" color="green" weight="medium">
                <CheckCircle size={16} style={{ display: "inline", marginRight: "8px" }} />
                Image selected successfully
              </Text>
              <Text size="1" color="gray" style={{ 
                background: "rgba(102, 126, 234, 0.1)",
                padding: "4px 12px",
                borderRadius: "12px",
                fontFamily: "monospace"
              }}>
                {selectedFile?.name}
              </Text>
            </Flex>
          ) : (
            <Flex direction="column" align="center" gap="4">
              <div style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 20px 40px rgba(102, 126, 234, 0.3)",
                marginBottom: "16px"
              }}>
                <Upload size={40} color="white" />
              </div>
              <Text size="5" weight="medium" style={{ color: "#667eea", marginBottom: "8px" }}>
                {isDragActive ? "Drop your image here" : "Click to upload or drag & drop"}
              </Text>
              <Text size="3" color="gray" style={{ maxWidth: "400px", lineHeight: "1.5" }}>
                Support for PNG, JPG, GIF, WEBP formats. 
                <br />Your image will be transformed into beautiful pixel art.
              </Text>
            </Flex>
          )}
        </div>
      </Card>

      {/* Pixel Size Selection with Premium Design */}
      {selectedFile && (
        <Card style={{ 
          padding: "28px", 
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(16, 185, 129, 0.1)"
        }}>
          <Flex direction="column" gap="4">
            <Text size="4" weight="medium" align="center" style={{ 
              color: "#10b981",
              marginBottom: "8px"
            }}>
              🎯 Choose Pixel Resolution
            </Text>
            <Flex justify="center" gap="3" wrap="wrap">
              {[8, 16, 32, 64].map((size) => (
                <Button
                  key={size}
                  variant={pixelSize === size ? "solid" : "outline"}
                  size="3"
                  onClick={() => setPixelSize(size)}
                  disabled={isPixelating}
                  style={{
                    background: pixelSize === size 
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                      : "transparent",
                    border: pixelSize === size 
                      ? "none" 
                      : "2px solid rgba(16, 185, 129, 0.3)",
                    color: pixelSize === size ? "white" : "#10b981",
                    borderRadius: "12px",
                    padding: "12px 20px",
                    fontWeight: "600",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: pixelSize === size 
                      ? "0 8px 24px rgba(16, 185, 129, 0.3)" 
                      : "0 4px 12px rgba(16, 185, 129, 0.1)",
                    transform: pixelSize === size ? "translateY(-2px)" : "none"
                  }}
                >
                  {size}x{size}
                </Button>
              ))}
            </Flex>
            <Text size="2" color="gray" align="center" style={{ marginTop: "8px" }}>
              {pixelStatus === 'success' 
                ? '🎨 Try different sizes to see various pixel art effects!' 
                : '💡 Smaller sizes create more pixelated, retro-style artwork'
              }
            </Text>
            {pixelStatus === 'success' && isPixelating && (
              <Flex align="center" justify="center" gap="2" style={{ 
                color: "#10b981",
                marginTop: "12px",
                padding: "12px",
                background: "rgba(16, 185, 129, 0.1)",
                borderRadius: "12px"
              }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                <Text size="2" weight="medium">Generating new pixel art...</Text>
              </Flex>
            )}
          </Flex>
        </Card>
      )}

      {/* Create Pixel Art Button with Premium Design */}
      {selectedFile && pixelStatus === 'idle' && (
        <Button 
          onClick={handlePixelate}
          disabled={isPixelating}
          size="4"
                      style={{ 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "16px",
              padding: "16px 32px",
              fontSize: "18px",
              fontWeight: "600",
              boxShadow: "0 20px 40px rgba(102, 126, 234, 0.3)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: "translateY(0)"
            }}
        >
          {isPixelating ? (
            <>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite", marginRight: "12px" }} />
              Creating Pixel Art...
            </>
          ) : (
            <>
              <Palette size={20} style={{ marginRight: "12px" }} />
              Create Pixel Art
            </>
          )}
        </Button>
      )}

      {/* Status Messages with Premium Design */}
      {pixelStatus === 'success' && (
        <Flex align="center" justify="center" gap="3" style={{ 
          color: "#10b981",
          padding: "16px 24px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(16, 185, 129, 0.2)"
        }}>
          <CheckCircle size={20} />
          <Text size="3" weight="medium">Pixel art created successfully!</Text>
        </Flex>
      )}

      {pixelStatus === 'error' && (
        <Flex align="center" justify="center" gap="3" style={{ 
          color: "#ef4444",
          padding: "16px 24px",
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(239, 68, 68, 0.2)"
        }}>
          <AlertCircle size={20} />
          <Text size="3" weight="medium">Failed to create pixel art. Please try again.</Text>
        </Flex>
      )}

      {/* Pixel Art Preview with Premium Design */}
      {pixelStatus === 'success' && pixelatedPreview && (
        <Card style={{ 
          padding: "32px", 
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(139, 92, 246, 0.1)"
        }}>
          <Flex direction="column" gap="6">
            <Text size="5" weight="medium" align="center" style={{ 
              color: "#8b5cf6",
              marginBottom: "8px"
            }}>
              🎨 NFT Preview
            </Text>
            <Flex justify="center" gap="8" wrap="wrap">
              <Flex direction="column" align="center" gap="3">
                <Text size="3" weight="medium" color="gray" style={{ marginBottom: "8px" }}>
                  Original Image
                </Text>
                <div style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.15)",
                  border: "3px solid rgba(139, 92, 246, 0.1)"
                }}>
                  <img 
                    src={imagePreview!} 
                    alt="Original" 
                    style={{ 
                      width: "140px", 
                      height: "140px", 
                      objectFit: "cover"
                    }} 
                  />
                </div>
              </Flex>
              
              <Flex direction="column" align="center" gap="3">
                <Text size="3" weight="medium" color="gray" style={{ marginBottom: "8px" }}>
                  Pixel Art NFT
                </Text>
                <div style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.15)",
                  border: "3px solid rgba(139, 92, 246, 0.2)",
                  position: "relative"
                }}>
                  <img 
                    src={pixelatedPreview} 
                    alt="Pixelated" 
                    style={{ 
                      width: "140px", 
                      height: "140px", 
                      objectFit: "cover"
                    }} 
                  />
                  <div style={{
                    position: "absolute",
                    bottom: "8px",
                    left: "8px",
                    right: "8px",
                    background: "rgba(139, 92, 246, 0.9)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: "600",
                    textAlign: "center",
                    backdropFilter: "blur(10px)"
                  }}>
                    {pixelSize}x{pixelSize} → 128x128
                  </div>
                </div>
                <Text size="1" color="gray" style={{ 
                  background: "rgba(139, 92, 246, 0.1)",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontFamily: "monospace"
                }}>
                  16KB limit optimized
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* NFT Metadata Form with Premium Design */}
      {pixelStatus === 'success' && (
        <Card style={{ 
          padding: "32px", 
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(59, 130, 246, 0.1)"
        }}>
          <Flex direction="column" gap="5">
            <Text size="4" weight="medium" align="center" style={{ 
              color: "#3b82f6",
              marginBottom: "8px"
            }}>
              📝 NFT Details
            </Text>
            
            <Box>
              <Text size="3" weight="medium" style={{ marginBottom: "12px", display: "block", color: "#374151" }}>
                NFT Name *
              </Text>
              <TextField.Root
                placeholder="e.g., Pixel Landscape #1"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                size="3"
                style={{
                  borderRadius: "12px",
                  border: "2px solid rgba(59, 130, 246, 0.2)",
                  transition: "all 0.3s ease"
                }}
              />
            </Box>

            <Box>
              <Text size="3" weight="medium" style={{ marginBottom: "12px", display: "block", color: "#374151" }}>
                Description
              </Text>
                              <TextArea
                  placeholder="Describe your pixel art NFT..."
                  value={nftDescription}
                  onChange={(e) => setNftDescription(e.target.value)}
                  rows={3}
                  resize="vertical"
                  style={{
                    borderRadius: "12px",
                    border: "2px solid rgba(59, 130, 246, 0.2)",
                    transition: "all 0.3s ease"
                  }}
                />
            </Box>

            <Button
              onClick={handleMint}
              disabled={!nftName.trim() || isMinting}
              size="4"
                              style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  borderRadius: "16px",
                  padding: "16px 32px",
                  fontSize: "18px",
                  fontWeight: "600",
                  marginTop: "24px",
                  boxShadow: "0 20px 40px rgba(16, 185, 129, 0.3)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: "translateY(0)"
                }}
            >
              {isMinting ? (
                <>
                  <ClipLoader size={20} color="#fff" style={{ marginRight: "12px" }} />
                  Creating NFT on Sui...
                </>
              ) : (
                <>
                  <ImageIcon size={20} style={{ marginRight: "12px" }} />
                  Mint Pixel Art NFT
                </>
              )}
            </Button>
          </Flex>
        </Card>
      )}

      {/* Info Card with Premium Design */}
      <Card style={{ 
        padding: "28px", 
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)",
        border: "1px solid rgba(102, 126, 234, 0.15)",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(102, 126, 234, 0.1)"
      }}>
        <Flex direction="column" gap="4">
          <Text size="4" weight="medium" align="center" style={{ 
            color: "#667eea",
            marginBottom: "8px"
          }}>
            💡 How It Works
          </Text>
          <Flex direction="column" gap="3">
            {[
              "1. Upload your image from your computer",
              "2. Choose pixel resolution (8x8 to 64x64)",
              "3. Click 'Create Pixel Art' to generate",
              "4. Image is automatically optimized for 16KB limit",
              "5. Fill in NFT details and mint on Sui blockchain"
            ].map((step, index) => (
              <Flex key={index} align="center" gap="3">
                <div style={{
                  width: "24px",
                  height: "24px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}>
                  {index + 1}
                </div>
                <Text size="3" color="gray" style={{ lineHeight: "1.5" }}>
                  {step}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Card>

      {/* Made by OverBlock Footer */}
      <Flex align="center" justify="center" style={{ 
        marginTop: "40px",
        padding: "24px",
        borderTop: "2px solid rgba(102, 126, 234, 0.15)",
        background: "rgba(102, 126, 234, 0.02)",
        borderRadius: "20px"
      }}>
        <Text size="3" color="gray" style={{ opacity: 0.8, fontWeight: "500", textAlign: "center" }}>
          Made with ❤️ by OverBlock
        </Text>
      </Flex>
    </Flex>
  );
}
