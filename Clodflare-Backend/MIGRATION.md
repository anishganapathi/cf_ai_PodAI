# Podcast Application - D1 Database Migration

This document describes the migration from Worker KV to D1 database for better data management and querying capabilities.

## What Changed

### Backend Changes
- **Removed**: Worker KV namespace (`PODCAST_CACHE`)
- **Added**: D1 database (`PODCAST_DB`) with proper relational schema
- **New Features**: 
  - User history tracking
  - Processing statistics
  - Error logging
  - Better data relationships

### Database Schema
The new D1 database includes three main tables:

1. **podcasts** - Main podcast data
2. **user_history** - User access tracking
3. **processing_logs** - Error logging and debugging

### API Changes
- **New Endpoints**:
  - `GET /history/:userId` - Get user's podcast history
  - `GET /stats` - Get application statistics
- **Updated Endpoints**:
  - `POST /check-cache` - Now queries D1 instead of KV
  - `GET /` - Health check now shows database status

## Migration Steps

### 1. Create D1 Database
```bash
cd Clodflare-Backend
./init-database.sh
```

### 2. Update wrangler.toml
Replace the database IDs in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "PODCAST_DB"
database_name = "podcast-database"
database_id = "your-actual-database-id"
preview_database_id = "your-actual-preview-database-id"
```

### 3. Deploy Updated Worker
```bash
wrangler deploy
```

### 4. Verify Migration
- Check health endpoint: `GET /`
- Test podcast generation
- Verify data is stored in D1

## Database Operations

### View Data
```bash
# List all podcasts
wrangler d1 execute podcast-database --command="SELECT * FROM podcasts ORDER BY created_at DESC LIMIT 10"

# Check user history
wrangler d1 execute podcast-database --command="SELECT * FROM user_history ORDER BY accessed_at DESC LIMIT 10"

# View statistics
wrangler d1 execute podcast-database --command="SELECT COUNT(*) as total_podcasts, COUNT(DISTINCT user_id) as unique_users FROM podcasts"
```

### Manual Database Operations
```bash
# Execute custom SQL
wrangler d1 execute podcast-database --command="YOUR_SQL_HERE"

# Execute from file
wrangler d1 execute podcast-database --file=schema.sql
```

## Benefits of D1 Migration

1. **Better Querying**: SQL queries instead of key-value lookups
2. **Data Relationships**: Foreign keys and joins
3. **Analytics**: Easy statistics and reporting
4. **User History**: Track user interactions
5. **Error Logging**: Better debugging capabilities
6. **Scalability**: Better performance for complex queries

## Troubleshooting

### Common Issues

1. **Database not found**: Ensure database IDs are correct in wrangler.toml
2. **Schema errors**: Run the schema.sql file manually
3. **Permission errors**: Check Wrangler authentication

### Debug Commands
```bash
# Check database status
wrangler d1 list

# View recent logs
wrangler tail

# Test database connection
wrangler d1 execute podcast-database --command="SELECT 1"
```

## Data Migration from KV

If you have existing data in KV that needs to be migrated:

1. Export KV data
2. Transform to D1 format
3. Import using D1 execute commands

Example migration script:
```javascript
// Export from KV
const kvData = await env.PODCAST_CACHE.list();

// Transform and insert into D1
for (const { key, value } of kvData.keys) {
  const podcastData = await env.PODCAST_CACHE.get(key, 'json');
  await savePodcast(env.PODCAST_DB, podcastData);
}
```

## Performance Considerations

- D1 has different performance characteristics than KV
- Use indexes for frequently queried columns
- Consider connection pooling for high-traffic applications
- Monitor query performance and optimize as needed

## Security Notes

- Database access is controlled by Wrangler authentication
- Use environment variables for sensitive configuration
- Implement proper input validation for SQL queries
- Regular backups recommended for production data
