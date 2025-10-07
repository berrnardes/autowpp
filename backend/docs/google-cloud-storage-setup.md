# Google Cloud Storage Setup Guide

This guide explains how to set up Google Cloud Storage for the WhatsApp Automated Messaging product image upload functionality.

## Prerequisites

1. Google Cloud Platform account
2. A GCP project created
3. Billing enabled on your GCP project

## Setup Steps

### 1. Enable Google Cloud Storage API

```bash
gcloud services enable storage.googleapis.com
```

### 2. Create a Storage Bucket

```bash
# Create a bucket (replace YOUR_BUCKET_NAME with your desired bucket name)
gsutil mb gs://YOUR_BUCKET_NAME

# Set bucket to be publicly readable (for product images)
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME
```

### 3. Create a Service Account

```bash
# Create service account
gcloud iam service-accounts create whatsapp-automation-storage \
    --description="Service account for WhatsApp automation storage" \
    --display-name="WhatsApp Automation Storage"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:whatsapp-automation-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

# Create and download service account key (for local development)
gcloud iam service-accounts keys create ~/whatsapp-automation-key.json \
    --iam-account=whatsapp-automation-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. Environment Configuration

#### Local Development

Set the following environment variables in your `.env` file:

```bash
GCP_PROJECT_ID=your_project_id
GCS_BUCKET_NAME=your_bucket_name
GOOGLE_APPLICATION_CREDENTIALS=/path/to/whatsapp-automation-key.json
```

#### Production (Cloud Run)

Set the following environment variables:

```bash
GCP_PROJECT_ID=your_project_id
GCS_BUCKET_NAME=your_bucket_name
# GOOGLE_APPLICATION_CREDENTIALS is not needed - Cloud Run uses default service account
```

Make sure your Cloud Run service has the necessary IAM permissions:

```bash
# Get the default compute service account
gcloud iam service-accounts list

# Grant storage permissions to the compute service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

## Features

The Google Cloud Storage integration provides:

- **Automatic image processing**: Resize and optimize images using Sharp
- **Public URLs**: Direct access to images via public URLs
- **Signed URLs**: Temporary access URLs for private files
- **Organized storage**: Images stored in `products/` folder structure
- **CDN ready**: Compatible with Google Cloud CDN for global delivery
- **Lifecycle management**: Automatic cleanup and versioning support

## Usage

The `ImageStorageService` automatically handles:

1. **File validation**: Type, size, and content validation
2. **Image processing**: Automatic resizing and format optimization
3. **Upload to GCS**: Secure upload with metadata
4. **Public URL generation**: Direct access URLs
5. **File deletion**: Cleanup when products are removed

## Security Considerations

- Service account follows principle of least privilege
- Images are stored in organized folder structure
- Public access is limited to read-only
- Signed URLs provide temporary access for sensitive content
- All uploads are validated and processed before storage

## Monitoring

Monitor your storage usage in the Google Cloud Console:

1. Go to Cloud Storage in the GCP Console
2. Select your bucket
3. View usage metrics and access logs
4. Set up alerts for storage quotas and costs

## Cost Optimization

- Images are automatically optimized to reduce storage costs
- Use lifecycle policies to automatically delete old images
- Monitor storage usage and set up billing alerts
- Consider using different storage classes for archival data