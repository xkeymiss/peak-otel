const addonRepository = require('../repositories/addonRepository');

class PricingService {
  /**
   * Calculate full booking price breakdown
   * @param {Object} room - Room entity
   * @param {string} checkIn - YYYY-MM-DD
   * @param {string} checkOut - YYYY-MM-DD
   * @param {number} guestCount - Number of guests
   * @param {Array<number>} selectedAddonIds - IDs of chosen add-ons
   */
  calculate({ room, checkIn, checkOut, guestCount = 1, selectedAddonIds = [] }) {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    // Difference in milliseconds converted to days
    const diffTime = endDate.getTime() - startDate.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      throw new Error('Çıkış tarihi giriş tarihinden sonra olmalıdır.');
    }

    const pricePerNight = room.price_per_night;
    const baseRoomTotal = pricePerNight * nights;

    // Process Add-ons
    let addonsTotal = 0;
    const resolvedAddons = [];

    if (Array.isArray(selectedAddonIds) && selectedAddonIds.length > 0) {
      for (const addonId of selectedAddonIds) {
        const addon = addonRepository.findById(addonId);
        if (!addon || !addon.is_active) continue;

        let addonCost = 0;
        if (addon.price_type === 'per_night') {
          addonCost = addon.price * nights;
        } else if (addon.price_type === 'per_person_per_night') {
          addonCost = addon.price * nights * guestCount;
        } else {
          // per_stay
          addonCost = addon.price;
        }

        addonsTotal += addonCost;
        resolvedAddons.push({
          id: addon.id,
          name: addon.name,
          unit_price: addon.price,
          price_type: addon.price_type,
          calculated_total: addonCost
        });
      }
    }

    // Subtotal before tax
    const subtotal = baseRoomTotal + addonsTotal;

    // 10% Konaklama Vergisi (Turizm / KDV)
    const taxRate = 0.10;
    const taxAmount = Math.round(subtotal * taxRate);
    const totalPrice = subtotal + taxAmount;

    return {
      nights,
      pricePerNight,
      baseRoomTotal,
      addons: resolvedAddons,
      addonsTotal,
      subtotal,
      taxRate: 10,
      taxAmount,
      totalPrice
    };
  }
}

module.exports = new PricingService();
