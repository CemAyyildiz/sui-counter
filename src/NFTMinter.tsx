import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Heading, Text, TextField, TextArea, Card, Box } from "@radix-ui/themes";
import { Upload, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [imageUrl, setImageUrl] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setUploadStatus('idle');
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

  const uploadToIPFS = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      // Görsel boyutunu küçültmek için canvas kullanarak resize yapalım
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Maksimum boyutları belirle (küçük boyut = küçük base64)
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          
          let { width, height } = img;
          
          // Orantılı olarak boyutlandır
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Görseli canvas'a çiz
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Base64'e çevir (JPEG formatında, düşük kalite)
          const base64 = canvas.toDataURL('image/jpeg', 0.3); // %30 kalite
          
          setTimeout(() => {
            resolve(base64);
          }, 2000); // 2 saniye bekleme simülasyonu
        };
        
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      const url = await uploadToIPFS(selectedFile);
      setImageUrl(url);
      setUploadStatus('success');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    }
  };

  const handleMint = async () => {
    if (!currentAccount || !imageUrl || !nftName.trim()) return;

    setIsMinting(true);
    
    const tx = new Transaction();
    
    // Collection ID'yi kullan (artık deploy edilmiş durumda)
    const finalCollectionId = collectionId;
    
    tx.moveCall({
      target: `${counterPackageId}::nft_minter::mint_image_nft`,
      arguments: [
        tx.object(finalCollectionId),
        tx.pure.string(nftName),
        tx.pure.string(nftDescription || "Kullanıcı tarafından yüklenen NFT"),
        tx.pure.string(imageUrl),
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
          setNftName("");
          setNftDescription("");
          setImageUrl("");
          setUploadStatus('idle');
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
    <Flex direction="column" gap="6" style={{ maxWidth: 600, margin: "0 auto", padding: "24px" }}>
      <Heading size="6" align="center" style={{ 
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: "8px"
      }}>
        🎨 NFT Oluşturucu
      </Heading>
      
      <Text size="3" align="center" color="gray" style={{ marginBottom: "24px" }}>
        Görselinizi yükleyin ve benzersiz NFT'nizi oluşturun
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
                PNG, JPG, GIF desteklenir (otomatik olarak küçültülür)
              </Text>
            </Flex>
          )}
        </div>
      </Card>

      {/* Upload to IPFS */}
      {selectedFile && uploadStatus === 'idle' && (
        <Button 
          onClick={handleUpload}
          disabled={isUploading}
          size="3"
          style={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none"
          }}
        >
          {isUploading ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: "8px" }} />
              Yükleniyor...
            </>
          ) : (
            <>
              <Upload size={16} style={{ marginRight: "8px" }} />
              IPFS'e Yükle
            </>
          )}
        </Button>
      )}

      {/* Upload Status */}
      {uploadStatus === 'success' && (
        <Flex align="center" justify="center" gap="2" style={{ color: "#10b981" }}>
          <CheckCircle size={16} />
          <Text size="2">Görsel başarıyla yüklendi!</Text>
        </Flex>
      )}

      {uploadStatus === 'error' && (
        <Flex align="center" justify="center" gap="2" style={{ color: "#ef4444" }}>
          <AlertCircle size={16} />
          <Text size="2">Yükleme başarısız. Tekrar deneyin.</Text>
        </Flex>
      )}

      {/* NFT Metadata Form */}
      {uploadStatus === 'success' && (
        <Card style={{ padding: "24px" }}>
          <Flex direction="column" gap="4">
            <Box>
              <Text size="3" weight="medium" style={{ marginBottom: "8px", display: "block" }}>
                NFT Adı *
              </Text>
              <TextField.Root
                placeholder="Örn: Güzel Manzara #1"
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
                  NFT Oluştur
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
            2. Görsel otomatik olarak küçültülüp optimize edilir
          </Text>
          <Text size="2" color="gray">
            3. NFT bilgilerini doldurun
          </Text>
          <Text size="2" color="gray">
            4. NFT'nizi oluşturun ve cüzdanınıza alın!
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
