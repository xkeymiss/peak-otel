const bookingRepository = require('../repositories/bookingRepository');
const roomRepository = require('../repositories/roomRepository');
const userRepository = require('../repositories/userRepository');

class AdminService {
  getDashboardSummary() {
    return bookingRepository.getDashboardMetrics();
  }

  /**
   * Generates a date-by-date occupancy matrix for all rooms.
   * Useful for Property Management System (PMS) timeline & calendar view.
   * @param {string} startDateStr - YYYY-MM-DD (defaults to today)
   * @param {number} daysCount - number of days to display (default: 14)
   */
  getOccupancyCalendarMatrix(startDateStr, daysCount = 14) {
    // Helper to safely parse and format dates without UTC/local timezone shifts
    function parseDate(str) {
      if (!str) return new Date();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0); // Noon prevents midnight boundary rollover
      }
      return new Date(str);
    }

    function formatYMD(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const startDate = parseDate(startDateStr);

    // Build array of dates
    const dates = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const isoDate = formatYMD(d);
      const dayName = d.toLocaleDateString('tr-TR', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('tr-TR', { month: 'short' });
      dates.push({
        iso: isoDate,
        label: `${dayNum} ${monthName}`,
        dayName,
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }

    const endDateStr = dates[dates.length - 1].iso;
    const allRooms = roomRepository.findAll({ status: 'active' });
    const bookings = bookingRepository.getBookingsInDateRange(dates[0].iso, endDateStr);

    // Build matrix for each room
    const roomMatrix = allRooms.map(room => {
      const roomBookings = bookings.filter(b => b.room_id === room.id);

      const days = dates.map(dateObj => {
        const currentDate = dateObj.iso;
        // A room is occupied on date D if check_in <= D AND check_out > D
        const matchingBooking = roomBookings.find(b => {
          return b.check_in <= currentDate && b.check_out > currentDate;
        });

        if (matchingBooking) {
          const isCheckInDay = matchingBooking.check_in === currentDate;
          return {
            date: currentDate,
            status: 'occupied',
            bookingId: matchingBooking.id,
            bookingCode: matchingBooking.booking_code,
            guestName: matchingBooking.guest_name,
            isCheckInDay
          };
        } else {
          return {
            date: currentDate,
            status: 'available',
            bookingId: null
          };
        }
      });

      return {
        room: {
          id: room.id,
          room_number: room.room_number,
          name: room.name,
          room_type: room.room_type,
          price_per_night: room.price_per_night,
          image_url: room.image_url,
          floor: room.floor
        },
        days
      };
    });

    // Daily occupancy stats
    const dailyStats = dates.map((dateObj, index) => {
      let occupiedCount = 0;
      roomMatrix.forEach(r => {
        if (r.days[index].status === 'occupied') {
          occupiedCount++;
        }
      });
      const rate = allRooms.length > 0 ? Math.round((occupiedCount / allRooms.length) * 100) : 0;
      return {
        date: dateObj.iso,
        occupiedCount,
        totalRooms: allRooms.length,
        occupancyRate: rate
      };
    });

    return {
      dates,
      matrix: roomMatrix,
      dailyStats
    };
  }

  getAllBookings(filters) {
    return bookingRepository.findAll(filters);
  }

  getAllCustomers() {
    return userRepository.getAllCustomers();
  }
}

module.exports = new AdminService();
