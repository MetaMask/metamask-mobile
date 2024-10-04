#!/usr/bin/env python3

import argparse
import json
import os

def update_bundle_size(file_path, commit_id, bundle_size, timestamp):
    # Read the existing content of the file
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            content = file.read()
            # Extract the data object from the content
            data_start = content.find('{')
            data_end = content.rfind('}')
            if data_start != -1 and data_end != -1:
                data_str = content[data_start:data_end+1]
                data = json.loads(data_str)
            else:
                data = {}
    else:
        data = {}

    # Update the data with new information
    # If commit_id already exists, it will overwrite the existing data
    data[commit_id] = {
        "ios": int(bundle_size),
        "timestamp": int(timestamp)
    }

    # Write the updated data back to the file
    with open(file_path, 'w') as file:
        file.write("const data = ")
        json.dump(data, file, indent=4, separators=(',', ': '))
        file.write(";\n")

def main():
    parser = argparse.ArgumentParser(description="Update bundle size data")
    parser.add_argument("file_path", help="Path to the data file")
    parser.add_argument("commit_id", help="Commit ID")
    parser.add_argument("bundle_size", type=int, help="Bundle size")
    parser.add_argument("timestamp", type=int, help="Timestamp")

    args = parser.parse_args()

    update_bundle_size(args.file_path, args.commit_id, args.bundle_size, args.timestamp)

if __name__ == "__main__":
    main()
