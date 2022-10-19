import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuid } from 'uuid';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { environment } from '../../environment';
const fs = require('fs');

const accountName = environment.AZURE_ACCOUNT_NAME;
const connStr = environment.AZURE_STORAGE_CONNECTION_STRING;
// Create the BlobServiceClient object which will be used to create a container client
let blobServiceClient;

@Controller('image')
export class ImageController {
  constructor() {
    blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
  }

  @Post('create/container/:id')
  async createContainer(@Param('id') name: string) {
    const containerName = name + '-' + uuid();
    console.log('\nCreating container: ', containerName);

    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create the container
    const createContainerResponse = await containerClient.create();
    console.log(
      'Container (' + containerName + ') was created successfully. requestId: ',
      createContainerResponse.requestId
    );
    return (
      'Container (' +
      containerName +
      ') was created successfully. requestId: ' +
      createContainerResponse.requestId
    );
  }

  @Get('get/container')
  async getAllContainers() {
    console.log('\nListing Containers..');
    var containers = [];

    let i = 1;
    for await (const container of blobServiceClient.listContainers()) {
      //console.log('Container ' + i++ + ': '+ container.name);
      containers.push({ id: i, name: container.name });
    }
    console.log(containers);
    return containers;
  }

  @Get('get/blobs/:id')
  async getAllBlobs(@Param('id') name: string) {
    const containerClient = blobServiceClient.getContainerClient(name);
    var blobs = [];

    console.log('\nListing blobs...');

    // List the blob(s) in the container.
    for await (const blob of containerClient.listBlobsFlat()) {
      //console.log('\t', blob.name);
      var link =
        'https://' +
        accountName +
        '.blob.core.windows.net/' +
        name +
        '/' +
        blob.name +
        '';
      blobs.push({ name: blob.name, url: link });
    }

    console.log(blobs);
    return blobs;
  }

  @Delete('delete/container/:id')
  async deleteContainer(@Param('id') name: string) {
    const containerClient = blobServiceClient.getContainerClient(name);
    console.log('\nDeleting container ', name);

    // Delete container
    const deleteContainerResponse = await containerClient.delete();
    //console.log("Container was deleted successfully. requestId: ", deleteContainerResponse.requestId);
    return (
      'Container (' +
      containerClient.containerName +
      ') deleted successfully. requestId: ' +
      deleteContainerResponse.requestId
    );
  }

  @Post('upload/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Generating a 32 random chars long string
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          //Calling the callback passing the random name generated with the original extension name
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    })
  )
  async upload(@UploadedFile() file, @Param('id') name: string) {
    // console.log(file);
    // console.log('File orginal name: ', file.originalname);
    // console.log('File saved name: ', file.filename);

    try {
      const blobName =
        file.originalname.substr(0, file.originalname.lastIndexOf('.')) +
        '-' +
        file.filename;
      //console.log('Blob name: ', blobName);
      const containerClient = blobServiceClient.getContainerClient(name);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const uploadBlobResponse = await blockBlobClient.uploadFile(file.path);
    } catch (err) {
      console.log('File Upload Error: ', err);
      return 'File Upload Error ' + err;
    }

    try {
      fs.unlinkSync('./uploads/' + file.filename);
      //console.log('File successfully deleted!');
    } catch (err) {
      console.log('File Delete Error: ', err);
      //return 'File Delete Error '+ err;
    }

    return 'File successfully uploaded to container ' + name;
  }
}
