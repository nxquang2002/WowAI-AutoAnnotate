from detectron2.utils.visualizer import GenericMask, Visualizer
# from detectron2.structures.masks import polygons_to_bitmask
from detectron2.utils.colormap import random_color
from utils import polygons_to_bitmask

import numpy as np
import cv2
import matplotlib.pyplot as plt



def test_polygon_to_mask():
    # polygon = [5,5,6,5,5,6,6,6,5,7,6,7,5,8,6,8]
    polygon = [10, 10, 10, 11, 10, 12, 10, 13, 10, 14,
               11, 14, 12, 14, 13, 14, 14, 14, 14, 13,
               14, 12, 14, 11, 14, 10, 13, 10, 12, 10, 11, 10]

    polygons = np.asarray(polygon)
    bit_mask = polygons_to_bitmask(polygons, 20, 20)
    print(1*bit_mask)

class Mask:
    def __init__(self, bit_mask=None):
        self.bit_mask = bit_mask

    def generatePolygons(self):
        mask = np.asarray(self.bit_mask)
        # plt.imshow(mask)
        # plt.savefig("mask_return_" + str(i) + '.jpg')
        mask = GenericMask(mask, self.bit_mask.shape[0], self.bit_mask.shape[1])
        polygon_boundary, has_hole = mask.mask_to_polygons(mask._mask)
        return polygon_boundary

    def pasteBitMask(self, bmask, height, width, top_left=(0,0)):
        self.bit_mask = np.full((height, width), False)

        y0, x0 = top_left
        y1 = y0 + bmask.shape[0]
        x1 = x0 + bmask.shape[1]
        self.bit_mask[y0:y1, x0:x1] = bmask

    def updateMask(self, modified_region, add=True):
        '''
        Function to update mask by include or exclude a given region
        Args:
            modified_region: a list of updated positions
            add: bool, if add==true, region is added, else, region is erased
          '''
        if add==True:
            # rows, cols = zip(*modified_region)
            rows, cols = modified_region
            self.bit_mask[rows, cols] = True
        else:
            rows, cols = modified_region
            self.bit_mask[rows, cols] = False

    def redrawMask(self, image):
        visualizer = Visualizer(image, metadata=None)
        visualized_output = visualizer.draw_binary_mask(self.bit_mask, alpha=0.6)
        output = visualized_output.get_image()[: ,: ,::-1]
        return output


class MasksManager:
    def __init__(self, image):
        self.masks = []
        self.image = image
        self.visualizer = Visualizer(image, metadata=None)

    def getMaskID(self, y, x):
        for idx in range(len(self.masks)):
            if self.masks[idx].bit_mask[y, x] == True:
                return idx
        return -1000

    def getPolygons(self, idx):
        if self.masks:
            if idx == -1 or (idx > -len(self.masks) and idx < len(self.masks)):
                mask = self.masks[idx]
                polygons = mask.generatePolygons()
                polygons = [polygon.tolist() for polygon in polygons]
                return polygons
        return None

    def addMask(self, bit_mask, top_left=(0, 0)):
        new_mask = Mask()
        new_mask.pasteBitMask(bit_mask, self.image.shape[0], self.image.shape[1], top_left)
        self.masks.append(new_mask)

    def addMasksFromPolygons(self, list_polygons):
        for polygons in list_polygons:
            # print('==========')
            # print(polygon)
            bit_mask = polygons_to_bitmask(polygons, self.image.shape[0], self.image.shape[1])
            # print(np.where(bit_mask != 0))
            # print('===========')
            mask = Mask(bit_mask)
            self.masks.append(mask)

    def removeMask(self, mask_id):
        if mask_id != -1000 and self.masks:
            self.masks.pop(mask_id)
        redrawm_image = self.redrawAllMasks()
        return redrawm_image

    def includeClickHandle(self, cluster):
        if self.masks:
            self.masks[-1].updateMask(cluster, add=True)
        redrawn_image = self.redrawAllMasks()
        return redrawn_image

    def excludeClickHandle(self, cluster):
        if self.masks:
            current_mask = self.masks[-1]
            current_mask.updateMask(cluster, add=False)
        redrawn_image = self.redrawAllMasks()
        return redrawn_image

    def mergeAllMasks(self):
        merged_mask = np.zeros((self.image.shape[0], self.image.shape[1])).astype(int)
        i = 0
        for mask in self.masks:
            print('Mask {}: {}'.format(i, mask))
            i = i + 1
            merged_mask = np.bitwise_or(merged_mask, mask.bit_mask.astype(int))
        # Using OR operation for merging binary masks
        return merged_mask

    def redrawAllMasks(self):
        print("No. of masks: {}".format(len(self.masks)))
        merged_mask = self.mergeAllMasks()
        visualized_output = self.visualizer.draw_binary_mask(merged_mask, alpha=0.6, area_threshold=512)
        output = visualized_output.get_image()[:, :, ::-1]
        output = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)
        return output

    def redrawAllPolygonMasks(self, polygons):
        if polygons:
            for polygon in polygons:
                color = random_color(rgb=True, maximum=1)
                polygon = polygon[0].reshape(-1,2)
                visualized_output = self.visualizer.draw_polygon(polygon, color=color)
            output = visualized_output.get_image()[:, :, ::-1]
            output = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)
            return output
        return self.image