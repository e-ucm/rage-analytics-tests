#!/bin/bash

# Help menu for the script.
usage () {
	echo "Usage: `basename $0` [-h] [-f] [-t] [-s] [http://localhost:3000/]"
	echo ""
	echo "where:   "
	echo "      -h   Show this help text. "
	echo "      -f   Sets the trace frequency (e.g. 10 equals 10 t/s), "
	echo "      -t   Sets the tracking code (optional), "
	echo "      -m   Sets the statement generator method (random|stored)"
	echo "      -b   Sets the tracker batch size (max sent traces per flush)"
	echo "      -s   Collector server name with port"
	echo ""
}

HOST=""
FREQUENCY="1"
TRACKINGCODE=""
METHOD=""
BATCHSIZE="10"
while getopts ":hf:b:t:m:s:" option; do 
	case $option in 
		f)
			FREQUENCY=$OPTARG ;;
		m)
			METHOD=$OPTARG ;;
		b)
			BATCHSIZE=$OPTARG ;;
		t)
			TRACKINGCODE=$OPTARG ;;
		s)
			HOST=$OPTARG ;;
		:) 
			usage
			exit 0
			;;
		h) # provide help
			usage
			exit 0
			;;
		\?)	#bla bla 
			usage
			exit 1 
			;;		
	esac
done


PARAMETERS="--frequency=$FREQUENCY"
if [ "$HOST" != "" ]; then
	PARAMETERS="$PARAMETERS --host=$HOST"
fi
if [ "$TRACKINGCODE" != "" ]; then
	PARAMETERS="$PARAMETERS --tracking_code=$TRACKINGCODE"
fi
if [ "$METHOD" != "" ]; then
	PARAMETERS="$PARAMETERS --method=$METHOD"
fi
if [ "$BATCHSIZE" != "10" ]; then
	PARAMETERS="$PARAMETERS --batch_size=$BATCHSIZE"
fi

node "./collectortest/test-rage.js" $PARAMETERS

echo "All Done!"