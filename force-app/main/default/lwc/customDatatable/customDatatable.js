import { LightningElement } from 'lwc';
import LightningDatatable from 'lightning/datatable';
import customAction from './customAction';
import customFolderType from './customFolderType';
import customName from './customName';
export default class CustomDatatable extends LightningDatatable {
    static customTypes = {
        customActionNew : {
            template : customAction,
            typeAttributes : ['recId', 'fileId']
        },

        customFolderType:{
            template: customFolderType,
            typeAttributes: ['isFolder']
        },

        customName:{
            template: customName,
            typeAttributes: ['isFolder', 'folderName', 'fileId', 'eTag']
        }
    }
}