/**
 * js/utils/imageResize.js
 * Utility para redimensionar imagens para dataURL usando Canvas
 */

/**
 * Redimensiona uma imagem em arquivo para dataURL
 * Melhor compatibilidade que window.resizeImageFile original
 * @param {File} file - Arquivo de imagem
 * @param {Object} options - { width, height, quality }
 * @returns {Promise<string>} dataURL da imagem redimensionada
 */
export async function resizeImageFile(file, options = {}) {
  const { width = 512, height = 512, quality = 0.88 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context is not available'));
          return;
        }

        // Desenha imagem escalada no canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Exibe como dataURL
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(new Error(`Canvas conversion failed: ${err.message}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Falha ao carregar a imagem'));
      };

      img.onabort = () => {
        reject(new Error('Carregamento da imagem foi cancelado'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler o arquivo'));
    };

    reader.onabort = () => {
      reject(new Error('Leitura do arquivo foi cancelada'));
    };

    // Começa a ler o arquivo como dataURL
    reader.readAsDataURL(file);
  });
}

// Expõe globalmente para que profile-ui.js acesse
window.resizeImageFile = resizeImageFile;
