pragma solidity ^0.4.11;

contract blockSize{

uint32[1] _blockSize=[
2000000 //block size in bytes
];
function getBlockSize() constant returns(uint32[1] _size){
	return _blockSize;
}

}

