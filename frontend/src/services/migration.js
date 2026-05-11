// Migration service for localStorage to PostgreSQL database
import { foodAPI, marketplaceAPI, donationAPI, subscriptionAPI } from '../api/database.js';

class MigrationService {
  constructor() {
    this.migrationKey = 'fresh_migration_done';
    this.backupKey = 'fresh_legacy_backup';
    this.isMigrated = this.checkMigrationStatus();
  }

  checkMigrationStatus() {
    try {
      return localStorage.getItem(this.migrationKey) === 'true';
    } catch (error) {
      console.warn('Error checking migration status:', error);
      return false;
    }
  }

  getLegacyLocalStorageData() {
    try {
      const data = {
        foods: JSON.parse(localStorage.getItem('fresh_foods') || '[]'),
        marketplace: JSON.parse(localStorage.getItem('fresh_marketplace') || '[]'),
        donations: JSON.parse(localStorage.getItem('fresh_donations') || '[]'),
        subscription: JSON.parse(localStorage.getItem('fresh_user_subscription') || '{}'),
        userInfo: JSON.parse(localStorage.getItem('fresh_session_user') || '{}'),
        accounts: JSON.parse(localStorage.getItem('fresh_accounts') || '{}'),
      };
      
      // Check if there's actually data to migrate
      const hasData = data.foods.length > 0 || 
                     data.marketplace.length > 0 || 
                     data.donations.length > 0 || 
                     Object.keys(data.subscription).length > 0;
      
      return hasData ? data : null;
    } catch (error) {
      console.error('Error getting legacy data:', error);
      return null;
    }
  }

  createBackup(legacyData) {
    try {
      localStorage.setItem(this.backupKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        data: legacyData,
      }));
      console.log('✅ Legacy data backed up successfully');
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  async migrateFoodItems(foods, userId, role) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const food of foods) {
      try {
        // Transform localStorage data to API format
        const foodData = {
          food_name: food.food_name || food.name || 'Unknown Food',
          category: food.category || 'Other',
          quantity: food.quantity || 1,
          unit: food.unit || 'pcs',
          purchase_date: food.purchase_date || null,
          expiration_date: food.expiration_date || food.expiry_date || null,
          storage_condition: food.storage_condition || 'Room Temperature',
          shelf_life: food.shelf_life || 7,
          notes: food.notes || '',
          is_finished: food.is_finished || false,
        };

        await foodAPI.createFood(foodData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          item: food.food_name || food.name,
          error: error.message,
        });
        console.warn(`Failed to migrate food item:`, food, error);
      }
    }

    return results;
  }

  async migrateMarketplaceItems(marketplace, userId, role) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const item of marketplace) {
      try {
        const itemData = {
          food_name: item.food_name || item.title || 'Unknown Item',
          category: item.category || 'Other',
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          price: item.price || 0,
          original_price: item.original_price || 0,
          discount_percentage: item.discount_percentage || 0,
          seller_name: item.seller_name || 'F.R.E.S.H User',
          location_name: item.location_name || item.location || '',
          latitude: item.latitude || -6.2088,
          longitude: item.longitude || 106.8456,
          expiration_date: item.expiration_date || null,
          status: item.status || 'Available',
          notes: item.notes || item.description || '',
        };

        await marketplaceAPI.createMarketplaceItem(itemData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          item: item.food_name || item.title,
          error: error.message,
        });
        console.warn(`Failed to migrate marketplace item:`, item, error);
      }
    }

    return results;
  }

  async migrateDonationItems(donations, userId, role) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const item of donations) {
      try {
        const itemData = {
          food_name: item.food_name || 'Unknown Item',
          category: item.category || 'Other',
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          donor_name: item.donor_name || 'F.R.E.S.H Donor',
          pickup_location: item.pickup_location || '',
          latitude: item.latitude || -6.2088,
          longitude: item.longitude || 106.8456,
          expiration_date: item.expiration_date || null,
          status: item.status || 'Available',
          notes: item.notes || '',
        };

        await donationAPI.createDonationItem(itemData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          item: item.food_name,
          error: error.message,
        });
        console.warn(`Failed to migrate donation item:`, item, error);
      }
    }

    return results;
  }

  async migrateSubscription(subscription, userId, role) {
    try {
      if (!subscription.plan_id) {
        console.log('No subscription data to migrate');
        return { success: true, message: 'No subscription data found' };
      }

      // Map old plan IDs to new ones
      const planMapping = {
        'free': 'free',
        'personal': 'personal_plus',
        'personal_plus': 'personal_plus',
        'business': 'business_pro',
        'business_pro': 'business_pro',
      };

      const planId = planMapping[subscription.plan_id] || 'free';
      
      await subscriptionAPI.upgradeSubscription(planId, userId);
      
      return { success: true, planId };
    } catch (error) {
      console.warn('Failed to migrate subscription:', error);
      return { success: false, error: error.message };
    }
  }

  async markMigrationDone() {
    try {
      localStorage.setItem(this.migrationKey, 'true');
      this.isMigrated = true;
      console.log('✅ Migration marked as complete');
    } catch (error) {
      console.error('Error marking migration done:', error);
    }
  }

  async migrateAll() {
    if (this.isMigrated) {
      return {
        success: true,
        message: 'Migration already completed',
        results: null,
      };
    }

    try {
      // Get legacy data
      const legacyData = this.getLegacyLocalStorageData();
      
      if (!legacyData) {
        await this.markMigrationDone();
        return {
          success: true,
          message: 'No legacy data found to migrate',
          results: null,
        };
      }

      // Create backup
      this.createBackup(legacyData);

      // Get user info
      const userId = legacyData.userInfo?.uid || 'demo-user';
      const role = legacyData.userInfo?.role || 'personal';

      console.log('🔄 Starting migration from localStorage to database...');
      console.log(`User ID: ${userId}, Role: ${role}`);

      const results = {
        foods: { success: 0, failed: 0, errors: [] },
        marketplace: { success: 0, failed: 0, errors: [] },
        donations: { success: 0, failed: 0, errors: [] },
        subscription: { success: false },
      };

      // Migrate foods
      if (legacyData.foods.length > 0) {
        console.log(`📦 Migrating ${legacyData.foods.length} food items...`);
        results.foods = await this.migrateFoodItems(legacyData.foods, userId, role);
      }

      // Migrate marketplace
      if (legacyData.marketplace.length > 0) {
        console.log(`🛒 Migrating ${legacyData.marketplace.length} marketplace items...`);
        results.marketplace = await this.migrateMarketplaceItems(legacyData.marketplace, userId, role);
      }

      // Migrate donations
      if (legacyData.donations.length > 0) {
        console.log(`🎁 Migrating ${legacyData.donations.length} donation items...`);
        results.donations = await this.migrateDonationItems(legacyData.donations, userId, role);
      }

      // Migrate subscription
      if (Object.keys(legacyData.subscription).length > 0) {
        console.log(`💳 Migrating subscription...`);
        results.subscription = await this.migrateSubscription(legacyData.subscription, userId, role);
      }

      // Mark migration as complete
      await this.markMigrationDone();

      // Calculate totals
      const totalSuccess = results.foods.success + results.marketplace.success + results.donations.success;
      const totalFailed = results.foods.failed + results.marketplace.failed + results.donations.failed;

      console.log('✅ Migration completed!');
      console.log(`✅ Successfully migrated: ${totalSuccess} items`);
      console.log(`❌ Failed to migrate: ${totalFailed} items`);

      return {
        success: true,
        message: `Migration completed! ${totalSuccess} items migrated successfully.`,
        results,
        totals: { success: totalSuccess, failed: totalFailed },
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  getMigrationStatus() {
    return {
      isMigrated: this.isMigrated,
      hasBackup: !!localStorage.getItem(this.backupKey),
      backupDate: this.getBackupDate(),
    };
  }

  getBackupDate() {
    try {
      const backup = JSON.parse(localStorage.getItem(this.backupKey) || '{}');
      return backup.timestamp || null;
    } catch (error) {
      return null;
    }
  }

  restoreFromBackup() {
    try {
      const backup = JSON.parse(localStorage.getItem(this.backupKey) || '{}');
      
      if (!backup.data) {
        throw new Error('No backup data found');
      }

      // Restore data to localStorage
      localStorage.setItem('fresh_foods', JSON.stringify(backup.data.foods || []));
      localStorage.setItem('fresh_marketplace', JSON.stringify(backup.data.marketplace || []));
      localStorage.setItem('fresh_donations', JSON.stringify(backup.data.donations || []));
      localStorage.setItem('fresh_user_subscription', JSON.stringify(backup.data.subscription || {}));
      
      console.log('✅ Data restored from backup');
      return true;
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return false;
    }
  }

  clearLegacyData() {
    try {
      const keysToClear = [
        'fresh_foods',
        'fresh_marketplace',
        'fresh_donations',
        'fresh_user_subscription',
        'fresh_session_user',
        'fresh_accounts',
      ];

      keysToClear.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('🧹 Legacy localStorage data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear legacy data:', error);
      return false;
    }
  }
}

// Create singleton instance
export const migrationService = new MigrationService();

// Export convenience functions
export const migrateLocalStorageToDatabase = () => migrationService.migrateAll();
export const getMigrationStatus = () => migrationService.getMigrationStatus();
export const restoreFromBackup = () => migrationService.restoreFromBackup();
export const clearLegacyData = () => migrationService.clearLegacyData();

export default migrationService;
