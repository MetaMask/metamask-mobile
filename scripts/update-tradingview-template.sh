#!/bin/bash

#
# TradingView Template Update Script
# =================================
# 
# This script automatically updates the TradingViewChartTemplate.tsx file
# with the contents from TradingViewChart.html for better development workflow.
# 
# Usage:
#   ./scripts/update-tradingview-template.sh
# 
# What it does:
# 1. Reads the HTML template file
# 2. Strips the documentation comments
# 3. Escapes the HTML for use in a TypeScript template literal
# 4. Updates the TradingViewChartTemplate.tsx file
# 5. Preserves the TypeScript imports and function structure
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# File paths
HTML_FILE="app/components/UI/Perps/components/TradingViewChart/TradingViewChart.html"
TEMPLATE_FILE="app/components/UI/Perps/components/TradingViewChart/TradingViewChartTemplate.tsx"

# Function to print colored output
log() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
show_usage() {
    echo ""
    log "$BOLD" "📊 TradingView Template Update Script"
    log "$BOLD" "====================================="
    echo ""
    log "$NC" "This script syncs TradingViewChart.html → TradingViewChartTemplate.tsx"
    echo ""
    log "$YELLOW" "Usage:"
    log "$NC" "  ./scripts/update-tradingview-template.sh"
    echo ""
    log "$YELLOW" "Files involved:"
    log "$NC" "  Source: $HTML_FILE"
    log "$NC" "  Target: $TEMPLATE_FILE"
    echo ""
}

# Function to strip HTML comments (documentation)
strip_comments() {
    local input_file=$1
    # Remove HTML comments and leading/trailing whitespace
    sed '/<!--/,/-->/d' "$input_file" | sed '/^[[:space:]]*$/d'
}

# Function to escape content for TypeScript template literal
escape_for_template() {
    # Escape backticks and ${} expressions that aren't our theme variables
    sed 's/`/\\`/g' | sed 's/\${/\\${/g; s/\\${\(theme\.[^}]*\)}/${\1}/g'
}

# Function to create the TypeScript template content
create_template_content() {
    local html_content=$1
    cat << EOF
import { Theme } from '../../../../../util/theme/models';

export const createTradingViewChartTemplate = (theme: Theme): string => \`$html_content\`;
EOF
}

# Main function
update_template() {
    # Check if files exist
    if [[ ! -f "$HTML_FILE" ]]; then
        log "$RED" "❌ HTML template file not found: $HTML_FILE"
        exit 1
    fi

    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        log "$RED" "❌ TypeScript template file not found: $TEMPLATE_FILE"
        exit 1
    fi

    log "$BLUE" "🔄 Reading HTML template file..."
    
    # Process the HTML file
    log "$BLUE" "⚙️  Processing HTML content..."
    html_content=$(strip_comments "$HTML_FILE" | escape_for_template)
    
    # Create new template content
    log "$BLUE" "📝 Updating TypeScript template file..."
    create_template_content "$html_content" > "$TEMPLATE_FILE"
    
    log "$GREEN" "✅ Successfully updated TradingViewChartTemplate.tsx!"
    echo ""
    log "$YELLOW" "📋 Next steps:"
    log "$NC" "1. Review the updated TradingViewChartTemplate.tsx file"
    log "$NC" "2. Test the TradingView chart in the React Native app"
    log "$NC" "3. Commit both files if changes look correct"
}

# Show usage and run the update
show_usage
update_template