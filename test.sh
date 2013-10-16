#!/bin/bash

for f in $(find torrent -name '*.zip'); do unzip -t $f; done

find torrent -name '*.zip' | while read myzip
do
	unzip -tq $myzip
	if [[ $? -ne 0 ]];then 
		echo "$myzip" >> corrupted_files.txt
	fi
done