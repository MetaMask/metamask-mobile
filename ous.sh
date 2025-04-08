#!/bin/bash

# Function to list OUs recursively
list_ous() {
    local parent_id=$1
    local indent=$2
    # Get OUs for the current parent
    aws organizations list-organizational-units-for-parent --parent-id "$parent_id" --output json | jq -r '.OrganizationalUnits[] | .Id + " " + .Name' | while read -r ou_id ou_name
    do
        echo "${indent}${ou_name} (${ou_id})"
        # Recursively list child OUs
        list_ous "$ou_id" "$indent    "
    done
}

# Start with the root ID
root_id="r-fwog"
echo "Root ($root_id)"
list_ous "$root_id" "    "

