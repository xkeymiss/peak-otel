const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

class PdfService {
  constructor() {
    this.fontRegular = path.join(__dirname, '..', 'assets', 'fonts', 'arial.ttf');
    this.fontBold = path.join(__dirname, '..', 'assets', 'fonts', 'arialbd.ttf');
  }

  /**
   * Generates a PDF stream for a booking voucher
   * @param {Object} booking - Booking entity
   * @param {stream.Writable} outputStream - Express res or file stream
   */
  generateVoucherPdf(booking, outputStream) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      info: {
        Title: `Peak Otel Rezervasyon - ${booking.booking_code}`,
        Author: 'Peak Otel Boutique & Suites'
      }
    });

    doc.pipe(outputStream);

    // Register Fonts with Turkish character support
    doc.registerFont('CustomRegular', this.fontRegular);
    doc.registerFont('CustomBold', this.fontBold);

    const gold = '#b8935c';
    const darkGold = '#9c7a45';
    const obsidian = '#181716';
    const stone = '#423f3b';
    const muted = '#797369';
    const bgLight = '#faf8f5';
    const borderSubtle = '#e8e4dc';

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);

    // Outer Decorative Luxury Border
    doc.rect(margin - 8, margin - 8, contentWidth + 16, pageHeight - (margin * 2) + 16)
       .lineWidth(1.5)
       .strokeColor(gold)
       .stroke();

    doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8)
       .lineWidth(0.5)
       .strokeColor('#e3d1ba')
       .stroke();

    let y = margin + 14;

    // Header: Hotel Brand & Document Type
    doc.font('CustomBold').fontSize(24).fillColor(obsidian)
       .text('PEAK OTEL', margin, y, { characterSpacing: 2 });
    
    doc.font('CustomBold').fontSize(9).fillColor(gold)
       .text('BOUTIQUE & SUITES • RESMİ REZERVASYON BELGESİ', margin, y + 28, { characterSpacing: 1.5 });

    // Right Side: Booking Code Box
    const codeBoxWidth = 180;
    const codeBoxX = pageWidth - margin - codeBoxWidth;
    
    doc.rect(codeBoxX, y - 4, codeBoxWidth, 48)
       .fillAndStroke(bgLight, '#dfc192');

    doc.font('CustomBold').fontSize(8).fillColor(muted)
       .text('REZERVASYON KODU', codeBoxX + 10, y + 4);

    doc.font('CustomBold').fontSize(16).fillColor(darkGold)
       .text(booking.booking_code, codeBoxX + 10, y + 18, { characterSpacing: 1 });

    y += 58;

    // Horizontal Divider
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(1).strokeColor(borderSubtle).stroke();
    y += 18;

    // Greeting Message
    doc.font('CustomRegular').fontSize(10.5).fillColor(stone)
       .text(`Sayın ${booking.guest_name}, Peak Otel'i tercih ettiğiniz için teşekkür ederiz. Konaklamanıza ait teyit bilgileri aşağıda yer almaktadır.`, margin, y, { width: contentWidth, lineGap: 3 });

    y += 36;

    // Helper to draw a section table box
    const drawInfoBox = (boxX, boxY, boxW, boxH, title, items) => {
      doc.rect(boxX, boxY, boxW, boxH).fillAndStroke(bgLight, borderSubtle);
      
      // Header strip
      doc.rect(boxX, boxY, boxW, 22).fillAndStroke('#f3ede2', borderSubtle);
      doc.font('CustomBold').fontSize(9).fillColor(darkGold)
         .text(title, boxX + 10, boxY + 6);

      let itemY = boxY + 28;
      items.forEach(item => {
        doc.font('CustomBold').fontSize(8.5).fillColor(muted)
           .text(item.label + ':', boxX + 10, itemY);
        doc.font('CustomRegular').fontSize(9.5).fillColor(obsidian)
           .text(item.value, boxX + 110, itemY, { width: boxW - 120 });
        itemY += 18;
      });
    };

    const halfWidth = (contentWidth - 14) / 2;

    // Box 1: Misafir Bilgileri
    const guestItems = [
      { label: 'Misafir Adı', value: booking.guest_name },
      { label: 'E-Posta', value: booking.guest_email || '—' },
      { label: 'Telefon', value: booking.guest_phone || '—' },
      { label: 'Kişi Sayısı', value: `${booking.guest_count} Misafir` }
    ];
    drawInfoBox(margin, y, halfWidth, 110, 'MİSAFİR BİLGİLERİ', guestItems);

    // Box 2: Konaklama Bilgileri
    const stayItems = [
      { label: 'Giriş Tarihi', value: `${booking.check_in} (Saat: 14:00)` },
      { label: 'Çıkış Tarihi', value: `${booking.check_out} (Saat: 12:00)` },
      { label: 'Süre', value: `${booking.total_nights} Gece Konaklama` },
      { label: 'Durum', value: 'ONAYLANDI (Girişte Ödeme)' }
    ];
    drawInfoBox(margin + halfWidth + 14, y, halfWidth, 110, 'KONAKLAMA DETAYLARI', stayItems);

    y += 124;

    // Box 3: Oda Detayı (Full Width)
    const roomNum = booking.room_number || '';
    const roomName = booking.room_name || '';
    const roomType = booking.room_type || '';
    
    doc.rect(margin, y, contentWidth, 70).fillAndStroke(bgLight, borderSubtle);
    doc.rect(margin, y, contentWidth, 22).fillAndStroke('#f3ede2', borderSubtle);
    doc.font('CustomBold').fontSize(9).fillColor(darkGold).text('TAHSİS EDİLEN ODA SEÇİMİ', margin + 10, y + 6);

    doc.font('CustomBold').fontSize(11).fillColor(obsidian)
       .text(`Oda ${roomNum} • ${roomName || roomType}`, margin + 10, y + 30);
    
    doc.font('CustomRegular').fontSize(9).fillColor(muted)
       .text(`Kategori: ${roomType}  |  Konum: 1. ve 3. Kat Arası Butik Yerleşim  |  Özellik: Akustik Ses Yalıtımı, Wi-Fi, Klima`, margin + 10, y + 48);

    y += 82;

    // Financial Breakdown Box
    doc.rect(margin, y, contentWidth, 100).fillAndStroke('#ffffff', '#dfc192');
    doc.rect(margin, y, contentWidth, 22).fillAndStroke(bgLight, '#dfc192');
    doc.font('CustomBold').fontSize(9).fillColor(darkGold).text('ÖDEME VE FİYAT DÖKÜMÜ', margin + 10, y + 6);

    let priceY = y + 30;
    doc.font('CustomRegular').fontSize(9).fillColor(stone).text('Oda Konaklama Ücreti:', margin + 14, priceY);
    doc.font('CustomBold').fontSize(9).fillColor(obsidian).text(`₺${Number(booking.base_price || 0).toLocaleString('tr-TR')}`, pageWidth - margin - 120, priceY, { width: 105, align: 'right' });

    priceY += 16;
    doc.font('CustomRegular').fontSize(9).fillColor(stone).text('Ekstra Hizmetler Toplamı:', margin + 14, priceY);
    doc.font('CustomBold').fontSize(9).fillColor(obsidian).text(`₺${Number(booking.addons_total || 0).toLocaleString('tr-TR')}`, pageWidth - margin - 120, priceY, { width: 105, align: 'right' });

    priceY += 16;
    doc.font('CustomRegular').fontSize(9).fillColor(stone).text('Konaklama Vergisi / KDV (%10):', margin + 14, priceY);
    doc.font('CustomBold').fontSize(9).fillColor(obsidian).text(`₺${Number(booking.tax_amount || 0).toLocaleString('tr-TR')}`, pageWidth - margin - 120, priceY, { width: 105, align: 'right' });

    // Grand Total Highlight Strip
    const totalBoxY = priceY + 16;
    doc.rect(margin, totalBoxY, contentWidth, 26).fill('#fbf5ea');
    doc.font('CustomBold').fontSize(11).fillColor(obsidian).text('TOPLAM TUTAR (KDV Dahil):', margin + 14, totalBoxY + 7);
    doc.font('CustomBold').fontSize(13).fillColor(darkGold).text(`₺${Number(booking.total_price).toLocaleString('tr-TR')}`, pageWidth - margin - 150, totalBoxY + 6, { width: 135, align: 'right' });

    y = totalBoxY + 38;

    // Special Requests if any
    if (booking.special_requests) {
      doc.rect(margin, y, contentWidth, 36).fillAndStroke(bgLight, borderSubtle);
      doc.font('CustomBold').fontSize(8).fillColor(muted).text('ÖZEL TALEPLER:', margin + 10, y + 6);
      doc.font('CustomRegular').fontSize(8.5).fillColor(obsidian).text(booking.special_requests, margin + 10, y + 18, { width: contentWidth - 20 });
      y += 44;
    }

    // Kurallar ve Bilgilendirme
    doc.font('CustomBold').fontSize(8.5).fillColor(darkGold).text('ÖNEMLİ KONAKLAMA BİLGİLENDİRMESİ', margin, y);
    y += 12;
    doc.font('CustomRegular').fontSize(8).fillColor(muted)
       .text('• Otele giriş (Check-in) saati 14:00, ayrılış (Check-out) saati en geç 12:00\'dir.', margin, y)
       .text('• Rezervasyon tutarı varış günü otel resepsiyonunda nakit veya kredi kartı ile tahsil edilecektir.', margin, y + 11)
       .text('• Giriş gününden 24 saat öncesine kadar yapılan iptaller tamamen ücretsizdir.', margin, y + 22)
       .text('• Kahvaltı paketini ek hizmet olarak seçen misafirlerimiz için servis Peak Teras\'ta 07:30 - 11:00 arasındadır.', margin, y + 33);

    // Footer
    const footerY = pageHeight - margin - 32;
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).lineWidth(0.5).strokeColor(borderSubtle).stroke();
    
    doc.font('CustomBold').fontSize(8).fillColor(stone)
       .text('Peak Otel Butik Konaklama A.Ş.', margin, footerY + 8);
    doc.font('CustomRegular').fontSize(7.5).fillColor(muted)
       .text('Nevşehir, Türkiye   |   Tel: +90 (555) 555 55 55   |   E-posta: info@peakotel.com   |   www.peakotel.com', margin, footerY + 18);

    doc.end();
  }
}

module.exports = new PdfService();
