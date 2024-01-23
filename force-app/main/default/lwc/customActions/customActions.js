import { LightningElement, api } from 'lwc';

export default class CustomActions extends LightningElement {

    @api recId;
    @api fileId;

    handleDeleteAction(){
        console.log('Delete Blob Event');
        const event = new CustomEvent('deleteFile', {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: {
                fileFolderObj : {
                    objName: this.fileName,
                }
            },
        });
        console.log('Delete event firing : ', event);
        this.dispatchEvent(event);
    }

    handleViewAction(){
        console.log('Copy Link Blob Event');
        const event = new CustomEvent('viewFile', {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: {
                fileFolderObj : {
                    objName: this.fileName,
                }
            },
        });
        console.log('Copy Link event firing : ', event);
        this.dispatchEvent(event);
    }
}